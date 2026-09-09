// The Workflow view connects value sources (editable components + variables,
// never modules or static text) to the required fields of imported labels —
// optionally through a chain of transform nodes in between.
//
// Every wire is an edge between two endpoints, each shaped one of:
//   { kind: 'source', id }                 — a Page-node row (output, fans out)
//   { kind: 'field', labelId, field }       — a label's required input (max 1 in)
//   { kind: 'transformIn', id }             — a transform node's input (max 1 in)
//   { kind: 'transformOut', id }            — a transform node's output (fans out)
// "Input" endpoints (field/transformIn) accept at most one incoming edge —
// wiring something new replaces whatever fed it. "Output" endpoints
// (source/transformOut) can fan out to as many edges as needed.

import { doc, allElements } from './state.svelte.js';
import { allValueSources, valueTypeOf, VALUE_PROP, resolveProp } from './bindings.js';
import { blockDefs } from './types.js';
import { getLabelById, getLabelThumbnail } from './labels.js';
import { typeIcon as variableTypeIcon } from './variables.js';

// Shared layout constants — both the SVG connection math in WorkflowView and
// every node component's own CSS must agree on these so drawn curves land
// exactly on the rendered sockets.
export const NODE_WIDTH = 260;
export const NODE_HEADER_H = 40;
export const ROW_H = 34;
export const ROW_PAD_TOP = 6;
// The node body's own vertical padding (6px * 2) plus its 1px top/bottom
// border — layout-only overhead a Label node's rendered height carries on
// top of its header and rows, needed to space nodes without overlap.
const NODE_CHROME_H = 14;
// A label node with a real thumbnail shows it as a big block above the field
// rows (roughly the same size as the Labels sidebar's own thumbnails), which
// pushes its rows down by a fixed amount — same idea as the header, just
// conditional on the label actually having art.
export const LABEL_THUMB_H = 110;

export function rowY(index) {
	return NODE_HEADER_H + ROW_PAD_TOP + index * ROW_H + ROW_H / 2;
}

function labelHeaderExtra(labelId) {
	return getLabelThumbnail(labelId) ? LABEL_THUMB_H : 0;
}

function labelRowY(labelId, index) {
	return NODE_HEADER_H + labelHeaderExtra(labelId) + ROW_PAD_TOP + index * ROW_H + ROW_H / 2;
}

// Components a user actually fills in — as opposed to "text", which is
// static copy the page author wrote, not a value someone supplies. Only
// these (plus variables) make sense as a workflow source.
const EDITABLE_COMPONENT_TYPES = new Set(['textfield', 'number', 'date', 'options']);

// The Page node's output rows: every editable component plus every page
// variable — never modules, never static/non-value components like text.
export function pageSources() {
	return allValueSources().filter((el) => {
		if (el.type === 'variable') return true;
		return EDITABLE_COMPONENT_TYPES.has(el.type);
	});
}

export function sourceIndex(id) {
	return pageSources().findIndex((s) => s.id === id);
}

export function sourceById(id) {
	return pageSources().find((s) => s.id === id) ?? null;
}

export function sourceIcon(source) {
	if (!source) return 'text';
	return source.type === 'variable' ? variableTypeIcon(source.varType) : (blockDefs[source.type]?.icon ?? 'text');
}

// A label's required inputs — the label node's input rows.
export function labelFields(labelId) {
	return getLabelById(labelId)?.required_fields ?? [];
}

export function fieldIndex(labelId, fieldName) {
	return labelFields(labelId).findIndex((f) => f.name === fieldName);
}

// ---------------------------------------------------------------------------
// Node layout — a node only gets an explicit entry in doc.workflow once the
// user drags it, so freshly-imported labels fall into a sensible default
// column instead of needing to be seeded up front.

function labelNodeHeight(labelId) {
	return NODE_HEADER_H + labelHeaderExtra(labelId) + Math.max(1, labelFields(labelId).length) * ROW_H + NODE_CHROME_H;
}

// Label nodes stack with a gap equal to one node header's height, per each
// prior node's own (field-count-dependent) height — not a flat guess.
function defaultNodePosition(key) {
	if (key === 'page') return { x: 60, y: 60 };
	const idx = Math.max(0, doc.labels.indexOf(key));
	let y = 60;
	for (let i = 0; i < idx; i++) y += labelNodeHeight(doc.labels[i]) + NODE_HEADER_H;
	return { x: 640, y };
}

export function nodePositionFor(key) {
	return doc.workflow.nodePositions[key] ?? defaultNodePosition(key);
}

export function setNodePosition(key, x, y) {
	doc.workflow.nodePositions[key] = { x, y };
}

// ---------------------------------------------------------------------------
// Endpoints

export function sourceEndpoint(id) {
	return { kind: 'source', id };
}
export function fieldEndpoint(labelId, field) {
	return { kind: 'field', labelId, field };
}
export function transformInEndpoint(id) {
	return { kind: 'transformIn', id };
}
export function transformOutEndpoint(id) {
	return { kind: 'transformOut', id };
}

function endpointsEqual(a, b) {
	if (!a || !b || a.kind !== b.kind) return false;
	if (a.kind === 'field') return a.labelId === b.labelId && a.field === b.field;
	return a.id === b.id;
}

// The single socket position math every node type (Page, Label, Transform)
// and the connection-drawing code in WorkflowView shares — so a curve always
// lands exactly where its socket is drawn, regardless of which kind of node
// is on either end.
export function endpointPos(endpoint) {
	if (!endpoint) return null;
	if (endpoint.kind === 'source') {
		const idx = sourceIndex(endpoint.id);
		if (idx === -1) return null;
		const pos = nodePositionFor('page');
		return { x: pos.x + NODE_WIDTH, y: pos.y + rowY(idx) };
	}
	if (endpoint.kind === 'field') {
		const idx = fieldIndex(endpoint.labelId, endpoint.field);
		if (idx === -1) return null;
		const pos = nodePositionFor(endpoint.labelId);
		return { x: pos.x, y: pos.y + labelRowY(endpoint.labelId, idx) };
	}
	// Both transform sockets sit on the sample-window row, right under the
	// (fixed-height) header — never inside the settings body, whose height
	// varies by type/mode, so this stays deterministic regardless of content.
	if (endpoint.kind === 'transformIn') {
		const t = getTransform(endpoint.id);
		if (!t) return null;
		return { x: t.x, y: t.y + NODE_HEADER_H + ROW_H / 2 };
	}
	if (endpoint.kind === 'transformOut') {
		const t = getTransform(endpoint.id);
		if (!t) return null;
		return { x: t.x + NODE_WIDTH, y: t.y + NODE_HEADER_H + ROW_H / 2 };
	}
	return null;
}

// ---------------------------------------------------------------------------
// Edges (connections)

function makeId() {
	return `wfc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function edgeInto(to) {
	return doc.workflow.connections.find((c) => endpointsEqual(c.to, to)) ?? null;
}

export function edgesFrom(from) {
	return doc.workflow.connections.filter((c) => endpointsEqual(c.from, from));
}

export function connectEndpoints(from, to) {
	const idx = doc.workflow.connections.findIndex((c) => endpointsEqual(c.to, to));
	if (idx !== -1) doc.workflow.connections.splice(idx, 1);
	doc.workflow.connections.push({ id: makeId(), from, to });
}

export function disconnectEdge(id) {
	const idx = doc.workflow.connections.findIndex((c) => c.id === id);
	if (idx !== -1) doc.workflow.connections.splice(idx, 1);
}

// Splices a brand-new transform into the middle of an existing edge:
// A -> B becomes A -> transformIn, transformOut -> B.
export function insertTransformIntoEdge(edgeId, transform) {
	const edge = doc.workflow.connections.find((c) => c.id === edgeId);
	if (!edge) return;
	const { from, to } = edge;
	disconnectEdge(edgeId);
	connectEndpoints(from, transformInEndpoint(transform.id));
	connectEndpoints(transformOutEndpoint(transform.id), to);
}

// Resolves the data type flowing out of an endpoint — used to decide which
// transform types make sense to offer, and which settings fields a
// transform's own node should show. `offset` preserves whatever type feeds
// it; every other transform normalizes to text (it hands back a formatted/
// composed string). `seen` guards a transform chain looping back on itself.
export function resolveValueType(from, seen = new Set()) {
	if (!from) return 'text';
	if (from.kind === 'source') return valueTypeOf(sourceById(from.id)) ?? 'text';
	if (from.kind === 'transformOut') {
		if (seen.has(from.id)) return 'text';
		seen.add(from.id);
		const t = getTransform(from.id);
		if (!t) return 'text';
		if (t.type === 'offset') {
			const upstream = edgeInto(transformInEndpoint(t.id));
			return upstream ? resolveValueType(upstream.from, seen) : (t.valueType ?? 'text');
		}
		return 'text';
	}
	return 'text';
}

// ---------------------------------------------------------------------------
// Transform nodes

export const TRANSFORM_TYPES = [
	{ value: 'offset', label: 'Offset', icon: 'number', types: ['number', 'date'], color: '#d97706' },
	{ value: 'format', label: 'Format', icon: 'bodyText', types: ['number', 'date'], color: '#0d9488' },
	{ value: 'textTransform', label: 'Text transform', icon: 'text', types: ['text'], color: '#db2777' },
	{ value: 'trim', label: 'Trim', icon: 'divider', types: ['text'], color: '#0891b2' },
	{ value: 'keep', label: 'Keep', icon: 'check', types: ['text'], color: '#4f46e5' },
	{ value: 'if', label: 'If', icon: 'bolt', types: ['number', 'date', 'text', 'boolean'], color: '#16a34a' },
	{ value: 'replace', label: 'Replace', icon: 'lookup', types: ['text'], color: '#c026d3' }
];

export function transformColor(type) {
	return TRANSFORM_TYPES.find((t) => t.value === type)?.color ?? '#8a8f98';
}

export const CURRENCIES = [
	{ value: 'USD', label: 'USD ($)' },
	{ value: 'EUR', label: 'EUR (€)' },
	{ value: 'GBP', label: 'GBP (£)' },
	{ value: 'JPY', label: 'JPY (¥)' },
	{ value: 'BRL', label: 'BRL (R$)' }
];
const CURRENCY_LOCALE = { USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', BRL: 'pt-BR' };

export function compatibleTransformTypes(valueType) {
	return TRANSFORM_TYPES.filter((t) => t.types.includes(valueType));
}

export function transformTypeLabel(type) {
	return TRANSFORM_TYPES.find((t) => t.value === type)?.label ?? type;
}

function nextTransformId() {
	return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultTransformSettings(type, valueType) {
	switch (type) {
		case 'offset':
			return { amount: 1, unit: 'day' };
		case 'format':
			return valueType === 'date'
				? { datePreset: 'MM/DD/YYYY' }
				: { mode: 'regular', currency: 'USD', percentScale: 'fraction', decimals: 2 };
		case 'textTransform':
			return { mode: 'uppercase' };
		case 'trim':
			return { left: 0, right: 0, trimWhitespace: true };
		case 'keep':
			return { left: 0, right: 0 };
		case 'if':
			return { operator: 'equals', compareValue: '', thenValue: '', elseValue: '' };
		case 'replace':
			return { find: '', replaceWith: '', scope: 'first' };
		default:
			return {};
	}
}

export function createTransform(type, x, y, valueType) {
	const transform = {
		id: nextTransformId(),
		type,
		name: transformTypeLabel(type), // user-editable, same rename UX as a component
		valueType, // resolved once at creation — drives which settings fields the node shows
		settings: defaultTransformSettings(type, valueType),
		x,
		y
	};
	doc.workflow.transforms.push(transform);
	return transform;
}

export function getTransform(id) {
	return doc.workflow.transforms.find((t) => t.id === id) ?? null;
}

export function setTransformPosition(id, x, y) {
	const t = getTransform(id);
	if (t) {
		t.x = x;
		t.y = y;
	}
}

// A short {icon, name} for whatever feeds an edge — a real source, or an
// upstream transform node — used by LabelNode/TransformNode to show what's
// plugged into their input without caring which kind it is.
export function describeFromEndpoint(from) {
	if (!from) return null;
	if (from.kind === 'source') {
		const s = sourceById(from.id);
		if (!s) return null;
		return { icon: sourceIcon(s), name: s.name, variable: s.type === 'variable' };
	}
	if (from.kind === 'transformOut') {
		const t = getTransform(from.id);
		if (!t) return null;
		const def = TRANSFORM_TYPES.find((tt) => tt.value === t.type);
		return { icon: def?.icon ?? 'bolt', name: t.name || def?.label || t.type, transform: true, color: def?.color };
	}
	return null;
}

export function renameTransform(id, name) {
	const t = getTransform(id);
	if (!t) return;
	const trimmed = name.trim();
	t.name = trimmed || transformTypeLabel(t.type);
}

export function removeTransform(id) {
	const idx = doc.workflow.transforms.findIndex((t) => t.id === id);
	if (idx !== -1) doc.workflow.transforms.splice(idx, 1);
	doc.workflow.connections = doc.workflow.connections.filter(
		(c) => !(c.from.kind === 'transformOut' && c.from.id === id) && !(c.to.kind === 'transformIn' && c.to.id === id)
	);
}

// ---------------------------------------------------------------------------
// Evaluation — powers both a transform's own live sample window (using
// stand-in values, computed in the builder) and the Preview payload's real
// field values (using each source's actual/overridden value).

export const SAMPLE_DEFAULTS = { text: 'Lorem Ipsum', number: '1234', boolean: 'true', date: '1992-10-10' };

// A source's own default value if it has one, else a type-appropriate
// stand-in — what a transform's sample window shows flowing in when nothing
// live (Preview) is available yet.
export function sampleValueForSource(source) {
	if (!source) return '';
	const key = VALUE_PROP[source.type];
	const raw = key ? source.props?.[key] : undefined;
	if (raw !== undefined && raw !== null && String(raw).trim() !== '') return raw;
	return SAMPLE_DEFAULTS[valueTypeOf(source) ?? 'text'] ?? SAMPLE_DEFAULTS.text;
}

const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

function addToDate(dateStr, amount, unit) {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	const n = Number(amount) || 0;
	if (unit === 'second') d.setSeconds(d.getSeconds() + n);
	else if (unit === 'minute') d.setMinutes(d.getMinutes() + n);
	else if (unit === 'hour') d.setHours(d.getHours() + n);
	else if (unit === 'week') d.setDate(d.getDate() + n * 7);
	else if (unit === 'month') d.setMonth(d.getMonth() + n);
	else if (unit === 'year') d.setFullYear(d.getFullYear() + n);
	else d.setDate(d.getDate() + n); // 'day' and default
	return d.toISOString().slice(0, 10);
}

function formatDate(dateStr, preset) {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	const month = MONTH_NAMES[d.getMonth()];
	switch (preset) {
		case 'DD/MM/YYYY':
			return `${dd}/${mm}/${yyyy}`;
		case 'YYYY-MM-DD':
			return `${yyyy}-${mm}-${dd}`;
		case 'MMM D, YYYY':
			return `${month.slice(0, 3)} ${d.getDate()}, ${yyyy}`;
		case 'D MMM YYYY':
			return `${d.getDate()} ${month.slice(0, 3)} ${yyyy}`;
		case 'MMMM D, YYYY':
			return `${month} ${d.getDate()}, ${yyyy}`;
		default: // 'MM/DD/YYYY'
			return `${mm}/${dd}/${yyyy}`;
	}
}

function formatNumber(value, settings) {
	const n = Number(value);
	if (Number.isNaN(n)) return String(value ?? '');
	if (settings.mode === 'currency') {
		const locale = CURRENCY_LOCALE[settings.currency] ?? 'en-US';
		return new Intl.NumberFormat(locale, { style: 'currency', currency: settings.currency ?? 'USD' }).format(n);
	}
	if (settings.mode === 'percentage') {
		const pct = settings.percentScale === 'whole' ? n / 100 : n;
		return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(pct);
	}
	const decimals = Number(settings.decimals);
	return n.toFixed(Number.isFinite(decimals) ? decimals : 2);
}

function applyTextTransform(value, mode) {
	const s = String(value ?? '');
	if (mode === 'uppercase') return s.toUpperCase();
	if (mode === 'lowercase') return s.toLowerCase();
	if (mode === 'capitalize') return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
	if (mode === 'sentence') return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
	return s;
}

function applyTrim(value, settings) {
	let s = String(value ?? '');
	if (settings.trimWhitespace) s = s.trim();
	const left = Math.max(0, Number(settings.left) || 0);
	const right = Math.max(0, Number(settings.right) || 0);
	if (left) s = s.slice(left);
	if (right) s = right < s.length ? s.slice(0, s.length - right) : '';
	return s;
}

function applyKeep(value, settings) {
	const s = String(value ?? '');
	const left = Math.max(0, Number(settings.left) || 0);
	const right = Math.max(0, Number(settings.right) || 0);
	if (!left && !right) return s;
	if (left + right >= s.length) return s;
	if (left && right) return s.slice(0, left) + s.slice(s.length - right);
	return left ? s.slice(0, left) : s.slice(s.length - right);
}

function evaluateIfCondition(raw, operator, compareValue) {
	if (operator === 'isEmpty') return raw === undefined || raw === null || String(raw) === '';
	if (operator === 'isNotEmpty') return !(raw === undefined || raw === null || String(raw) === '');
	if (['greaterThan', 'lessThan', 'greaterOrEqual', 'lessOrEqual'].includes(operator)) {
		const a = Number(raw);
		const b = Number(compareValue);
		if (Number.isNaN(a) || Number.isNaN(b)) return false;
		if (operator === 'greaterThan') return a > b;
		if (operator === 'lessThan') return a < b;
		if (operator === 'greaterOrEqual') return a >= b;
		return a <= b;
	}
	if (operator === 'after' || operator === 'before') {
		const a = new Date(raw).getTime();
		const b = new Date(compareValue).getTime();
		if (Number.isNaN(a) || Number.isNaN(b)) return false;
		return operator === 'after' ? a > b : a < b;
	}
	const a = String(raw ?? '');
	const b = String(compareValue ?? '');
	if (operator === 'notEquals') return a !== b;
	if (operator === 'contains') return a.includes(b);
	if (operator === 'startsWith') return a.startsWith(b);
	if (operator === 'endsWith') return a.endsWith(b);
	return a === b; // 'equals' and default
}

function applyIf(value, settings) {
	const match = evaluateIfCondition(value, settings.operator ?? 'equals', settings.compareValue);
	return match ? (settings.thenValue ?? '') : (settings.elseValue ?? '');
}

function applyReplace(value, settings) {
	const s = String(value ?? '');
	if (!settings.find) return s;
	if (settings.scope === 'all') return s.split(settings.find).join(settings.replaceWith ?? '');
	const idx = s.indexOf(settings.find);
	if (idx === -1) return s;
	return s.slice(0, idx) + (settings.replaceWith ?? '') + s.slice(idx + settings.find.length);
}

// The single evaluator behind both the sample window and live Preview
// values — same settings shape either way, only the input differs.
export function applyTransform(type, settings, input, valueType) {
	if (type === 'offset') {
		return valueType === 'date'
			? addToDate(input, settings.amount, settings.unit)
			: String((Number(input) || 0) + (Number(settings.amount) || 0));
	}
	if (type === 'format') return valueType === 'date' ? formatDate(input, settings.datePreset) : formatNumber(input, settings);
	if (type === 'textTransform') return applyTextTransform(input, settings.mode);
	if (type === 'trim') return applyTrim(input, settings);
	if (type === 'keep') return applyKeep(input, settings);
	if (type === 'if') return applyIf(input, settings);
	if (type === 'replace') return applyReplace(input, settings);
	return input;
}

// Sample chain: walks from an endpoint back to its ultimate source, using
// stand-in values (never previewOverrides/live state) — what the builder
// shows inside each transform's sample window.
export function sampleValueForEndpoint(from, seen = new Set()) {
	if (!from) return '';
	if (from.kind === 'source') return sampleValueForSource(sourceById(from.id));
	if (from.kind === 'transformOut') {
		if (seen.has(from.id)) return '';
		seen.add(from.id);
		const t = getTransform(from.id);
		if (!t) return '';
		const upstream = edgeInto(transformInEndpoint(t.id));
		const input = upstream ? sampleValueForEndpoint(upstream.from, seen) : '';
		return applyTransform(t.type, t.settings, input, t.valueType);
	}
	return '';
}

// Live chain: same shape, but reads through resolveProp (previewOverrides,
// bindings, then the static prop) — what actually reaches a label's field
// while Preview is open.
export function resolveEndpointValue(from, seen = new Set()) {
	if (!from) return '';
	if (from.kind === 'source') {
		const src = sourceById(from.id);
		const key = src && VALUE_PROP[src.type];
		return key ? (resolveProp(src, key) ?? '') : '';
	}
	if (from.kind === 'transformOut') {
		if (seen.has(from.id)) return '';
		seen.add(from.id);
		const t = getTransform(from.id);
		if (!t) return '';
		const upstream = edgeInto(transformInEndpoint(t.id));
		const input = upstream ? resolveEndpointValue(upstream.from, seen) : '';
		return applyTransform(t.type, t.settings, input, t.valueType);
	}
	return '';
}

export function resolveFieldValue(labelId, field) {
	const edge = edgeInto(fieldEndpoint(labelId, field));
	return edge ? resolveEndpointValue(edge.from) : '';
}

// "The label selected, which is always one": whatever a Label Selector
// module on the page currently resolves to (falling back to the first
// imported label the same way that module itself does) — or, if the page
// never gives the user a choice at all, just the first imported label. null
// only when nothing has been imported.
export function selectedLabelId() {
	const selector = allElements().find((el) => el.type === 'labelSelector');
	if (selector) return resolveProp(selector, 'selectedLabelId') ?? doc.labels[0] ?? null;
	return doc.labels[0] ?? null;
}
