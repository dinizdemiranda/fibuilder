import { blockDefs } from './types.js';
import { labelDefinitions } from './labels.js';

let idCounter = 0;
function nextId(type) {
	idCounter += 1;
	return `${type}_${idCounter}`;
}

export const doc = $state({
	page: {
		title: 'Untitled Page',
		background: '#ffffff',
		primaryColor: '#0b57d0',
		cornerRadius: 8,
		orientation: 'landscape', // 'portrait' | 'landscape'
		columns: 1, // 1 | 2
		columnRatio: '50/50', // '35/65' | '50/50' | '65/35' — only used when columns === 2
		showColumnDivider: true,
		footer: {
			showSecondary: true,
			showText: true,
			secondaryLabel: 'Cancel',
			textLabel: 'Skip',
			primaryLabel: 'Continue'
		}
	},
	elements: [], // column A (the only column when columns === 1)
	elementsB: [], // column B — kept even when hidden, so toggling columns doesn't lose data
	labels: labelDefinitions.map((l) => l.id), // ids of imported label_options.json definitions, in import order
	variables: [], // [{ id, name, type: 'string'|'number'|'boolean'|'date', defaultValue }]
	workflow: {
		connections: [], // [{ id, from: endpoint, to: endpoint }] — see workflow.js for endpoint shapes
		transforms: [], // [{ id, type, valueType, settings, x, y }] — intermediate nodes, own position lives on the record
		nodePositions: {} // 'page' | labelId -> { x, y }, in canvas space — set on first drag
	}
});

export const uiState = $state({
	selectedId: null,
	previewOpen: false,
	mode: 'design', // 'design' | 'workflow'
	// The id of the single innermost block currently under the pointer. Plain CSS
	// :hover (and even mouseenter/mouseleave) fire on every ancestor a nested
	// block sits inside, so hover state is tracked explicitly instead — see
	// CanvasBlock's mouseover/mouseout handlers.
	hoveredId: null
});

// Workflow canvas pan/zoom — view-only, never persisted with the document.
export const workflowView = $state({
	zoom: 1,
	panX: 80,
	panY: 60
});

// Page/Label node layout — see workflow.js's nodePositionFor/setNodePosition
// for the accessors (they need labelFields/ROW_H to size labels correctly,
// which would make this file import workflow.js right back).

// Shadow drag state, read synchronously by drop targets. HTML5 DnD's
// dataTransfer payload can't be read during dragover (only its type keys can),
// so this is what dragover/drop handlers actually check.
export const dragState = $state({
	kind: null, // 'new' | 'move'
	elementType: null,
	elementId: null,
	overContainerId: undefined // which FlowZone last claimed the pointer (undefined = none yet)
});

// Runtime-only overrides applied while Preview is open, e.g. a button's "Set
// value" / "Show" / "Hide" event acting on another component. Never touches
// doc — these are read by resolveProp() ahead of bindings/static props, and
// are wiped every time Preview (re)opens (see PreviewModal.svelte).
export const previewOverrides = $state({});

export function setPreviewOverride(elementId, key, value) {
	if (!previewOverrides[elementId]) previewOverrides[elementId] = {};
	previewOverrides[elementId][key] = value;
}

export function resetPreviewOverrides() {
	for (const id of Object.keys(previewOverrides)) delete previewOverrides[id];
	for (const id of Object.keys(previewCommands)) delete previewCommands[id];
}

// Reverts one element's field back to its bound/static value — e.g. "Reset
// filters" clearing whatever a user typed into a field a Data Lookup filter
// was reading from.
export function clearPreviewOverride(elementId, key) {
	if (previewOverrides[elementId]) delete previewOverrides[elementId][key];
}

// One-shot imperative commands (as opposed to a value override) fired at a
// component instance while Preview is open — e.g. a button's "Refresh" event
// telling a specific Data Lookup module to re-run its filters right now. The
// target component's own $effect watches its own id/command pair and reacts
// each time the nonce changes; the number itself carries no meaning.
export const previewCommands = $state({});

export function triggerPreviewCommand(elementId, command) {
	if (!previewCommands[elementId]) previewCommands[elementId] = {};
	previewCommands[elementId][command] = (previewCommands[elementId][command] ?? 0) + 1;
}

export function beginDragNew(type) {
	dragState.kind = 'new';
	dragState.elementType = type;
	dragState.elementId = null;
	dragState.overContainerId = undefined;
}

export function beginDragMove(element) {
	dragState.kind = 'move';
	dragState.elementType = element.type;
	dragState.elementId = element.id;
	dragState.overContainerId = undefined;
}

export function endDrag() {
	dragState.kind = null;
	dragState.elementType = null;
	dragState.elementId = null;
	dragState.overContainerId = undefined;
}

// A "root" container is a page column, not a section. null = column A, 'colB' = column B.
function isRootContainerId(id) {
	return id === null || id === undefined || id === 'colB';
}

function rootListFor(containerId) {
	return containerId === 'colB' ? doc.elementsB : doc.elements;
}

function findSectionById(id) {
	return (
		doc.elements.find((el) => el.type === 'section' && el.id === id) ??
		doc.elementsB.find((el) => el.type === 'section' && el.id === id) ??
		null
	);
}

function listFor(containerId) {
	if (isRootContainerId(containerId)) return rootListFor(containerId);
	return findSectionById(containerId)?.children ?? null;
}

// Elements live at most two levels deep: a page column, or a section's children
// within a column. Sections can't nest, so this is the whole search space.
function locateContainer(id) {
	for (const rootList of [doc.elements, doc.elementsB]) {
		const idx = rootList.findIndex((el) => el.id === id);
		if (idx !== -1) return { list: rootList, index: idx, element: rootList[idx] };
		for (const el of rootList) {
			if (el.type === 'section') {
				const cIdx = el.children.findIndex((c) => c.id === id);
				if (cIdx !== -1) return { list: el.children, index: cIdx, element: el.children[cIdx] };
			}
		}
	}
	return { list: null, index: -1, element: null };
}

// Every element (component, module, or section) across both columns and any
// section children — the whole space element names must stay unique within.
export function allElements() {
	const out = [];
	const collect = (list) => {
		for (const el of list) {
			out.push(el);
			if (el.type === 'section') collect(el.children);
		}
	};
	collect(doc.elements);
	collect(doc.elementsB);
	return out;
}

export function isNameTaken(name, excludeId = null) {
	return allElements().some((el) => el.id !== excludeId && el.name === name);
}

// "Button" -> "Button" if free, else "Button 2", "Button 3", ...
function uniqueName(baseLabel) {
	const existing = new Set(allElements().map((el) => el.name));
	if (!existing.has(baseLabel)) return baseLabel;
	let n = 2;
	while (existing.has(`${baseLabel} ${n}`)) n += 1;
	return `${baseLabel} ${n}`;
}

export function renameElement(id, newName) {
	const trimmed = newName.trim();
	if (!trimmed || isNameTaken(trimmed, id)) return false;
	const { element } = locateContainer(id);
	if (!element) return false;
	element.name = trimmed;
	// A manual rename opts the element out of auto-naming from its Label
	// field for good — see trySyncNameFromLabel.
	element.nameAuto = false;
	return true;
}

// Keeps an element's name mirroring whatever it's labeled, right up until
// the user renames it manually (renameElement flips nameAuto off for good).
// Types with no "label" prop (text, image, section, divider, modules) just
// never trigger this, since element.props.label is undefined for them.
export function trySyncNameFromLabel(element) {
	if (!element || element.nameAuto === false) return;
	const label = element.props?.label;
	if (typeof label !== 'string') return;
	const trimmed = label.trim();
	if (!trimmed || trimmed === element.name || isNameTaken(trimmed, element.id)) return;
	element.name = trimmed;
}

export function selectedElement() {
	if (!uiState.selectedId) return null;
	return locateContainer(uiState.selectedId).element;
}

export function selectElement(id) {
	uiState.selectedId = id;
}

// target: { containerId: null | 'colB' | sectionId, index }
export function addElement(type, target = {}) {
	const def = blockDefs[type];
	if (!def) return null;
	let containerId = target.containerId ?? null;
	// Sections can only live in a column — never inside another section.
	if (type === 'section' && !isRootContainerId(containerId)) containerId = null;
	const toList = listFor(containerId);
	if (!toList) return null;

	// A fresh Text Field/Number/Date/Options/Button starts named after its own
	// default Label value (e.g. "Order ID"), not the generic palette label —
	// trySyncNameFromLabel keeps it in sync as that field changes, until the
	// user renames the element manually.
	const name = uniqueName(def.defaultProps?.label || def.label);
	// Every component (not module) gets shared hidden/disabled fields — plain
	// text for now ("true"/"false"), holding room for conditions later.
	const visibilityProps = def.category === 'component' ? { hidden: 'false', disabled: 'false' } : {};
	const el =
		type === 'section'
			? {
					id: nextId('section'),
					type: 'section',
					name,
					direction: 'horizontal',
					itemSizing: 'auto', // 'auto' | 'fill'
					justify: 'left', // 'left' | 'center' | 'right' | 'around' | 'between' | 'evenly'
					gap: 16,
					children: [],
					props: { ...visibilityProps },
					bindings: {},
					events: []
				}
			: {
					id: nextId(type),
					type,
					name,
					nameAuto: true,
					props: { ...visibilityProps, ...structuredClone(def.defaultProps) },
					bindings: {},
					events: []
				};

	const index = Math.max(0, Math.min(target.index ?? toList.length, toList.length));
	toList.splice(index, 0, el);
	uiState.selectedId = el.id;
	return el;
}

export function setLabels(ids) {
	doc.labels = [...ids];
}

// Wipes the page's content back to blank — components, variables, and the
// Workflow graph — but keeps imported labels, data sources, and page
// settings, since those are project setup, not layout the user built.
export function clearCanvas() {
	doc.elements = [];
	doc.elementsB = [];
	doc.variables = [];
	doc.workflow.connections = [];
	doc.workflow.transforms = [];
	doc.workflow.nodePositions = {};
	uiState.selectedId = null;
}

export function removeElement(id) {
	const { list, index } = locateContainer(id);
	if (!list || index === -1) return;
	list.splice(index, 1);
	if (uiState.selectedId === id) uiState.selectedId = null;
}

// target: { containerId: null | 'colB' | sectionId, index }
export function moveElement(id, target = {}) {
	const { list: fromList, index: fromIndex, element } = locateContainer(id);
	if (!element) return;
	let containerId = target.containerId ?? null;
	if (element.type === 'section' && !isRootContainerId(containerId)) containerId = null;
	const toList = listFor(containerId);
	if (!toList) return;

	const sameList = toList === fromList;
	let idx = target.index ?? toList.length;
	fromList.splice(fromIndex, 1);
	if (sameList && fromIndex < idx) idx -= 1;
	idx = Math.max(0, Math.min(idx, toList.length));
	toList.splice(idx, 0, element);
	uiState.selectedId = id;
}
