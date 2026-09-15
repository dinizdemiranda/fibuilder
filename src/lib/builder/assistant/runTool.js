// Browser-only dispatcher: executes one tool call against the live `doc`,
// returning { ok, result?, warning?, error? } — never throwing, so a bad
// call becomes something the model can see and react to on its next turn
// (runTool itself wraps every handler in try/catch as a last-resort safety
// net, but each handler is expected to validate up front and return
// ok:false rather than rely on that).

import { doc, allElements, addElement, moveElement, removeElement, renameElement, addColumn } from '../state.svelte.js';
import { sourceCandidates, anySourceCandidates, previewFormula, getFieldType, VALUE_PROP, VALUE_TYPE, valueTypeOf, allValueSources } from '../bindings.js';
import {
	createVariable,
	removeVariable,
	getVariableById,
	variableInCycle,
	uniqueVariableName,
	isVariableNameTaken
} from '../variables.js';
import { coerceFormulaResult } from '../formulas.js';
import { CONTROL_METHODS } from '../events.js';
import { getDataSourceById, uniqueColumnValues } from '../dataSources.js';
import { availableDataSources } from '../projects.js';
import { getLabelById } from '../labels.js';
import { blockDefs } from '../types.js';
import { resizeTracks, resizeGridChildren } from '../columnGrid.js';
// The tool-facing VARIABLE_TYPES (plain strings, e.g. "string") — not
// variables.js's same-named export, which is the UI dropdown's
// {value,label,icon} shape and would never match a model-supplied string.
import { ELEMENT_TYPES, GALLERY_FIELD_KEYS, VARIABLE_TYPES } from './tools.js';

function findElement(id) {
	return allElements().find((el) => el.id === id) ?? null;
}

// The container id an element actually lives in RIGHT NOW — null (col A),
// 'colB', or a section/grid id — or undefined if it doesn't exist at all.
// Used to detect addElement/moveElement's silent fallback-to-root behavior
// for illegal nesting requests, since neither function reports it directly.
function actualContainerIdOf(id) {
	const owner = allElements().find(
		(el) => (el.type === 'section' || el.type === 'grid') && el.children.some((c) => c?.id === id)
	);
	if (owner) return owner.id;
	if (doc.elementsB.some((el) => el?.id === id)) return 'colB';
	if (doc.elements.some((el) => el?.id === id)) return null;
	return undefined;
}

// Every prop key an AI is allowed to write on this element — its type's
// defaultProps, plus the shared hidden/disabled visibility fields every
// "component"-category type gets (added by addElement, not listed in
// blockDefs' own defaultProps).
function validFieldsFor(element) {
	const def = blockDefs[element.type];
	const base = def?.defaultProps ? Object.keys(def.defaultProps) : [];
	const visibility = def?.category === 'component' ? ['hidden', 'disabled'] : [];
	return [...base, ...visibility];
}

function newId(prefix) {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// --- structure ---------------------------------------------------------

// Column B's elements array (doc.elementsB) exists and holds content
// regardless of doc.page.columns — it's rendered only when
// doc.page.columns === 2. The human UI only ever gets content into colB via
// the "add a column" button, which sets that flag as part of the same
// gesture (see addColumn in state.svelte.js), so there's no way for a
// person to end up with invisible colB content. A tool call that places
// something in colB without also flipping this would be a footgun the human
// UI doesn't have — so do it automatically here instead of requiring the
// model to remember a second, separate call every time.
function ensureColumnVisible(containerId) {
	if (containerId === 'colB' && doc.page.columns !== 2) addColumn('right');
}

function addElementTool({ type, containerId = null, index }) {
	if (!ELEMENT_TYPES.includes(type)) return { ok: false, error: `Unknown type "${type}".` };
	if (containerId) {
		const container = findElement(containerId);
		if (!container || (container.type !== 'section' && container.type !== 'grid')) {
			return { ok: false, error: `"${containerId}" is not a Section or Grid.` };
		}
	}
	const el = addElement(type, { containerId, index });
	if (!el) return { ok: false, error: 'Could not add the element (invalid target — e.g. an occupied/out-of-range grid cell).' };
	const actual = actualContainerIdOf(el.id);
	ensureColumnVisible(actual);
	const result = { id: el.id, type: el.type, name: el.name, containerId: actual };
	if (actual !== containerId) {
		return {
			ok: true,
			result,
			warning: `Requested container "${containerId}" isn't legal for a ${type} (illegal nesting) — placed at the page root instead.`
		};
	}
	return { ok: true, result };
}

function moveElementTool({ elementId: id, containerId = null, index }) {
	if (!findElement(id)) return { ok: false, error: `No element with id "${id}".` };
	const before = actualContainerIdOf(id);
	const { type } = findElement(id);
	moveElement(id, { containerId, index });
	const after = actualContainerIdOf(id);
	if (after === before && before !== containerId) {
		return { ok: false, error: 'Move did not happen (invalid target — e.g. an occupied/out-of-range grid cell).' };
	}
	ensureColumnVisible(after);
	const result = { id, containerId: after };
	if (after !== containerId) {
		return {
			ok: true,
			result,
			warning: `Requested container "${containerId}" isn't legal for a ${type} (illegal nesting) — it landed at the page root instead.`
		};
	}
	return { ok: true, result };
}

function removeElementTool({ elementId: id }) {
	if (!findElement(id)) return { ok: false, error: `No element with id "${id}".` };
	removeElement(id);
	return { ok: true, result: { id } };
}

function renameElementTool({ elementId: id, name }) {
	if (!findElement(id)) return { ok: false, error: `No element with id "${id}".` };
	if (!renameElement(id, name)) return { ok: false, error: `"${name}" is blank or already in use.` };
	return { ok: true, result: { id, name } };
}

// --- layout (Section/Grid top-level fields, not .props) -----------------

function setSectionLayoutTool({ elementId, direction, itemSizing, justify, align, gap }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	if (element.type !== 'section') return { ok: false, error: `"${elementId}" is not a Section.` };
	if (direction !== undefined) element.direction = direction;
	if (itemSizing !== undefined) element.itemSizing = itemSizing;
	if (justify !== undefined) element.justify = justify;
	if (align !== undefined) element.align = align;
	if (gap !== undefined) element.gap = gap;
	return { ok: true, result: { id: elementId } };
}

function setGridLayoutTool({ elementId, columns, rows }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	if (element.type !== 'grid') return { ok: false, error: `"${elementId}" is not a Grid.` };
	if (columns !== undefined) {
		const newColumns = resizeTracks(element.colTracks, columns);
		resizeGridChildren(element, newColumns, element.rows);
		element.columns = newColumns;
	}
	if (rows !== undefined) {
		const newRows = resizeTracks(element.rowTracks, rows);
		resizeGridChildren(element, element.columns, newRows);
		element.rows = newRows;
	}
	return { ok: true, result: { id: elementId, columns: element.columns, rows: element.rows } };
}

// --- field values ---------------------------------------------------------

function setFieldValueTool({ elementId, field, value }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	const valid = validFieldsFor(element);
	if (!valid.includes(field)) {
		return { ok: false, error: `"${field}" is not a field on a ${element.type}. Available: ${valid.join(', ') || '(none — use set_section_layout/set_grid_layout)'}.` };
	}
	if (element.bindings?.[field]) delete element.bindings[field];
	element.props[field] = value;
	return { ok: true, result: { id: elementId, field, value } };
}

function fieldCandidates(element, field) {
	const isCanonical = field === VALUE_PROP[element.type];
	return isCanonical ? sourceCandidates(element.id, VALUE_TYPE[element.type]) : anySourceCandidates(element.id);
}

// A specific, actionable explanation for why `id` can't be used as a
// reference/formula source — the single most common way the model goes
// wrong (e.g. trying to point a field at a Gallery or Button, neither of
// which has a single value to read). Falls back to a generic type-mismatch
// note when the source is real and does have a value, just the wrong kind.
function describeInvalidSource(id) {
	const src = allValueSources().find((s) => s.id === id);
	if (!src) return `"${id}" doesn't exist (it's not an element or variable id from the current page).`;
	if (valueTypeOf(src) === undefined) {
		const hint =
			src.type === 'gallery' || src.type === 'dataLookup'
				? 'use add_row_select_event to copy one of its columns into a variable or field instead'
				: src.type === 'button'
					? "buttons act via events (add_button_control_event/add_button_set_variable_event) — they don't hold a value"
					: 'it has no bindable value field';
		return `"${id}" is a ${src.type} — it has no single value to reference (${hint}).`;
	}
	return `"${id}" (a ${src.type}) doesn't match the type this field expects.`;
}

function setFieldReferenceTool({ elementId, field, sourceId }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	const valid = validFieldsFor(element);
	if (!valid.includes(field)) {
		return { ok: false, error: `"${field}" is not a field on a ${element.type}. Available: ${valid.join(', ') || '(none)'}.` };
	}
	if (!fieldCandidates(element, field).some((c) => c.id === sourceId)) {
		return { ok: false, error: describeInvalidSource(sourceId) };
	}
	if (!element.bindings) element.bindings = {};
	element.bindings[field] = { kind: 'expression', parts: [{ type: 'ref', sourceId }] };
	return { ok: true, result: { id: elementId, field, sourceId } };
}

function setFieldFormulaTool({ elementId, field, code, refs = {} }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	const valid = validFieldsFor(element);
	if (!valid.includes(field)) {
		return { ok: false, error: `"${field}" is not a field on a ${element.type}. Available: ${valid.join(', ') || '(none)'}.` };
	}
	const candidates = fieldCandidates(element, field);
	for (const sourceId of Object.values(refs)) {
		if (!candidates.some((c) => c.id === sourceId)) return { ok: false, error: describeInvalidSource(sourceId) };
	}
	const preview = previewFormula(refs, code);
	if (!preview.ok) return { ok: false, error: `Formula error: ${preview.error}` };
	if (!element.bindings) element.bindings = {};
	element.bindings[field] = { kind: 'expression', parts: [{ type: 'formula', formula: { code, refs } }] };
	return { ok: true, result: { id: elementId, field, preview: preview.value } };
}

function clearFieldBindingTool({ elementId, field }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	if (element.bindings?.[field]) delete element.bindings[field];
	return { ok: true, result: { id: elementId, field } };
}

// --- variables -----------------------------------------------------------

function createVariableTool({ name, type, value }) {
	if (!VARIABLE_TYPES.includes(type)) return { ok: false, error: `Unknown variable type "${type}".` };
	const finalName = isVariableNameTaken(name) ? uniqueVariableName(name) : name;
	const variable = createVariable({ name: finalName, type, value });
	const result = { id: variable.id, name: finalName, type };
	if (finalName !== name) return { ok: true, result, warning: `"${name}" was already in use — created as "${finalName}" instead.` };
	return { ok: true, result };
}

function removeVariableTool({ variableId }) {
	if (!getVariableById(variableId)) return { ok: false, error: `No variable with id "${variableId}".` };
	removeVariable(variableId);
	return { ok: true, result: { id: variableId } };
}

function setVariableValueTool({ variableId, value }) {
	const variable = getVariableById(variableId);
	if (!variable) return { ok: false, error: `No variable with id "${variableId}".` };
	if (variable.bindings?.value) delete variable.bindings.value;
	variable.props.value = value;
	return { ok: true, result: { id: variableId, value } };
}

function setVariableFormulaTool({ variableId, code, refs = {}, baseDate }) {
	const variable = getVariableById(variableId);
	if (!variable) return { ok: false, error: `No variable with id "${variableId}".` };

	const fieldType = getFieldType({ type: 'variable', varType: variable.type }, 'value');
	const candidates = sourceCandidates(variableId, fieldType);
	for (const sourceId of Object.values(refs)) {
		if (!candidates.some((c) => c.id === sourceId)) return { ok: false, error: `"${sourceId}" isn't a valid reference target for this variable.` };
	}

	const preview = previewFormula(refs, code);
	if (!preview.ok) return { ok: false, error: `Formula error: ${preview.error}` };
	const coerced = coerceFormulaResult(variable.type, preview.value);
	if (!coerced.ok) return { ok: false, error: `Formula result doesn't match this variable's type (${variable.type}).` };

	// A date-typed variable's expression treats a lone formula part as a
	// day-offset, never a full date — it needs an accompanying date base
	// part (see evalExpression's date branch, bindings.js).
	const parts =
		variable.type === 'date'
			? [{ type: 'literal', value: baseDate || new Date().toISOString().slice(0, 10) }, { type: 'formula', formula: { code, refs } }]
			: [{ type: 'formula', formula: { code, refs } }];

	const prevBindingsValue = variable.bindings.value;
	const prevPropsValue = variable.props.value;
	variable.bindings.value = { kind: 'expression', parts };

	if (variableInCycle(variableId)) {
		if (prevBindingsValue) variable.bindings.value = prevBindingsValue;
		else delete variable.bindings.value;
		variable.props.value = prevPropsValue;
		return { ok: false, error: 'This formula creates a loop between variables — not applied.' };
	}

	return { ok: true, result: { id: variableId, preview: coerced.value } };
}

// --- events ----------------------------------------------------------------

function addButtonControlEventTool({ buttonId, targetId, method, value, direction }) {
	const button = findElement(buttonId);
	if (!button) return { ok: false, error: `No element with id "${buttonId}".` };
	if (button.type !== 'button') return { ok: false, error: `"${buttonId}" is not a Button.` };
	const target = findElement(targetId);
	if (!target) return { ok: false, error: `No element with id "${targetId}".` };
	const methods = CONTROL_METHODS[target.type] ?? [];
	if (!methods.includes(method)) return { ok: false, error: `"${target.type}" doesn't support "${method}". Supported: ${methods.join(', ') || '(none)'}.` };
	if (method === 'toggleEnabled' && !['enable', 'disable'].includes(direction)) {
		return { ok: false, error: 'direction must be "enable" or "disable" for toggleEnabled.' };
	}
	if (method === 'toggleVisibility' && !['hide', 'show'].includes(direction)) {
		return { ok: false, error: 'direction must be "hide" or "show" for toggleVisibility.' };
	}
	const event = {
		id: newId('evt'),
		trigger: 'click',
		action: 'controlComponent',
		targetId,
		method,
		direction: direction ?? '',
		variableId: '',
		varMethod: '',
		props: { value: value ?? '' },
		bindings: {}
	};
	if (!button.events) button.events = [];
	button.events.push(event);
	return { ok: true, result: { id: event.id } };
}

function addButtonSetVariableEventTool({ buttonId, variableId, varMethod, value }) {
	const button = findElement(buttonId);
	if (!button) return { ok: false, error: `No element with id "${buttonId}".` };
	if (button.type !== 'button') return { ok: false, error: `"${buttonId}" is not a Button.` };
	if (!getVariableById(variableId)) return { ok: false, error: `No variable with id "${variableId}".` };
	if (!['set', 'clear', 'resetToDefault'].includes(varMethod)) return { ok: false, error: `Unknown varMethod "${varMethod}".` };
	if (varMethod === 'set' && value === undefined) return { ok: false, error: '"value" is required when varMethod is "set".' };
	const event = {
		id: newId('evt'),
		trigger: 'click',
		action: 'setVariable',
		targetId: '',
		method: '',
		direction: '',
		variableId,
		varMethod,
		props: { value: value ?? '' },
		bindings: {}
	};
	if (!button.events) button.events = [];
	button.events.push(event);
	return { ok: true, result: { id: event.id } };
}

function addRowSelectEventTool({ moduleId, action, targetId, variableId, column }) {
	const mod = findElement(moduleId);
	if (!mod) return { ok: false, error: `No element with id "${moduleId}".` };
	if (mod.type !== 'dataLookup' && mod.type !== 'gallery') return { ok: false, error: `"${moduleId}" is not a Data Lookup or Gallery.` };
	const source = getDataSourceById(mod.props.dataSourceId);
	if (!source) return { ok: false, error: `"${moduleId}" has no data source set yet.` };
	if (!source.columns.includes(column)) return { ok: false, error: `"${column}" isn't a column on "${source.name}". Columns: ${source.columns.join(', ')}.` };
	if (action === 'controlComponent') {
		const target = findElement(targetId);
		if (!target || !(CONTROL_METHODS[target.type] ?? []).includes('setValue')) {
			return { ok: false, error: `"${targetId}" can't have a field set directly.` };
		}
	} else if (action === 'setVariable') {
		if (!getVariableById(variableId)) return { ok: false, error: '"variableId" must reference an existing variable for action "setVariable".' };
	} else {
		return { ok: false, error: `Unknown action "${action}".` };
	}
	const event = { id: newId('evt'), trigger: 'select', action, targetId: targetId ?? '', variableId: variableId ?? '', column };
	if (!mod.events) mod.events = [];
	mod.events.push(event);
	return { ok: true, result: { id: event.id } };
}

function removeEventTool({ elementId, eventId }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	const idx = (element.events ?? []).findIndex((e) => e.id === eventId);
	if (idx === -1) return { ok: false, error: `No event with id "${eventId}" on "${elementId}".` };
	element.events.splice(idx, 1);
	return { ok: true, result: { elementId, eventId } };
}

// --- data & labels -----------------------------------------------------

function setModuleDataSourceTool({ elementId, dataSourceId }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	if (!['dataLookup', 'gallery', 'options'].includes(element.type)) return { ok: false, error: `"${elementId}" doesn't use a data source.` };
	const available = availableDataSources();
	if (!available.some((s) => s.id === dataSourceId)) {
		return { ok: false, error: `"${dataSourceId}" isn't available in this project. Available: ${available.map((s) => s.id).join(', ')}.` };
	}
	if (element.type === 'dataLookup') {
		element.props.dataSourceId = dataSourceId;
		const src = getDataSourceById(dataSourceId);
		element.props.columns = src ? src.columns.map((name) => ({ name, visible: true })) : [];
		element.props.filters = [];
	} else if (element.type === 'gallery') {
		element.props.dataSourceId = dataSourceId;
		element.props.filters = [];
	} else {
		element.props.sourceMode = 'mapped';
		element.props.mappedSourceId = dataSourceId;
		element.props.mappedColumn = null;
	}
	return { ok: true, result: { id: elementId, dataSourceId } };
}

function getDataSourceSampleTool({ dataSourceId }) {
	const source = getDataSourceById(dataSourceId);
	if (!source) return { ok: false, error: `No data source "${dataSourceId}".` };
	const sample = {};
	for (const col of source.columns) sample[col] = uniqueColumnValues(source, col).slice(0, 5);
	return { ok: true, result: { id: source.id, name: source.name, rowCount: source.rows.length, sample } };
}

function setGalleryFieldTool({ elementId, key, enabled, parts }) {
	const element = findElement(elementId);
	if (!element) return { ok: false, error: `No element with id "${elementId}".` };
	if (element.type !== 'gallery') return { ok: false, error: `"${elementId}" is not a Gallery.` };
	if (!GALLERY_FIELD_KEYS.includes(key)) return { ok: false, error: `Unknown gallery field "${key}".` };
	const field = element.props.fields.find((f) => f.key === key);
	if (!field) return { ok: false, error: `Gallery is missing its "${key}" field slot (unexpected).` };
	field.enabled = enabled;
	if (parts !== undefined) {
		const source = getDataSourceById(element.props.dataSourceId);
		for (const p of parts) {
			if (!['literal', 'column', 'variable'].includes(p.type)) return { ok: false, error: `Invalid gallery field part type "${p.type}".` };
			if (p.type === 'variable' && !getVariableById(p.variableId)) return { ok: false, error: `"${p.variableId}" isn't a known variable.` };
			if (p.type === 'column' && source && !source.columns.includes(p.column)) {
				return { ok: false, error: `"${p.column}" isn't a column on this Gallery's data source.` };
			}
		}
		field.parts = parts;
	}
	return { ok: true, result: { id: elementId, key, enabled } };
}

function importLabelTool({ labelId }) {
	if (!getLabelById(labelId)) return { ok: false, error: `Unknown label "${labelId}".` };
	if (!doc.labels.includes(labelId)) doc.labels.push(labelId);
	return { ok: true, result: { labelId } };
}

function removeLabelTool({ labelId }) {
	const idx = doc.labels.indexOf(labelId);
	if (idx === -1) return { ok: false, error: `"${labelId}" isn't imported.` };
	doc.labels.splice(idx, 1);
	return { ok: true, result: { labelId } };
}

// Pure signal to the client — mutates nothing. AssistantPanel.svelte gives
// this call special rendering (a distinct "question" bubble, option
// buttons) and stops the round loop right after it, rather than treating it
// like an ordinary tool step.
function askQuestionTool({ question, options }) {
	return { ok: true, result: { question, options: Array.isArray(options) ? options.slice(0, 5) : [] } };
}

// Also a pure signal — AssistantPanel.svelte renders this as a stylized
// numbered-phase card instead of the plain-text plan the model would
// otherwise write out itself. Unlike ask_question this does NOT pause the
// round loop — the model is expected to move straight into phase 1's tool
// calls next.
function presentPlanTool({ phases }) {
	const clean = Array.isArray(phases) ? phases.slice(0, 5).map((p) => ({ title: p?.title ?? '', detail: p?.detail })) : [];
	if (clean.length < 2) return { ok: false, error: 'A plan needs at least 2 phases.' };
	return { ok: true, result: { phases: clean } };
}

// --- dispatch ------------------------------------------------------------

const HANDLERS = {
	add_element: addElementTool,
	move_element: moveElementTool,
	remove_element: removeElementTool,
	rename_element: renameElementTool,
	set_section_layout: setSectionLayoutTool,
	set_grid_layout: setGridLayoutTool,
	set_field_value: setFieldValueTool,
	set_field_reference: setFieldReferenceTool,
	set_field_formula: setFieldFormulaTool,
	clear_field_binding: clearFieldBindingTool,
	create_variable: createVariableTool,
	remove_variable: removeVariableTool,
	set_variable_value: setVariableValueTool,
	set_variable_formula: setVariableFormulaTool,
	add_button_control_event: addButtonControlEventTool,
	add_button_set_variable_event: addButtonSetVariableEventTool,
	add_row_select_event: addRowSelectEventTool,
	remove_event: removeEventTool,
	set_module_data_source: setModuleDataSourceTool,
	get_data_source_sample: getDataSourceSampleTool,
	set_gallery_field: setGalleryFieldTool,
	import_label: importLabelTool,
	remove_label: removeLabelTool,
	ask_question: askQuestionTool,
	present_plan: presentPlanTool
};

export function runTool(name, args) {
	const handler = HANDLERS[name];
	if (!handler) return { ok: false, error: `Unknown tool "${name}".` };
	try {
		return handler(args ?? {});
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
}
