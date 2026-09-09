// Dynamic values: a field (a component's value/default value, or its
// hidden/disabled state) can be computed instead of typed in directly.
//
// Two independent mechanisms, both stored under element.bindings[propKey]:
//  - 'expression' — built inline in the field itself (ExpressionField.svelte):
//    a sequence of literal text and "chips" referencing other components,
//    e.g. [First Name chip] " " [Last Name chip]. For number/date fields the
//    parts are summed instead of concatenated, which doubles as "add/subtract"
//    math (a literal "30", or a Number-component chip, after a date chip = +/-
//    that many days).
//  - 'condition' — set via the lightning-bolt button (BindingPopover.svelte):
//    "when other fields match X, use this value; otherwise use that one."
// A field has at most one of these at a time; setting a condition takes over
// from whatever expression was there, and vice versa.

import { allElements, previewOverrides, doc } from './state.svelte.js';

// Which prop on each element type holds its "value" — the thing other
// elements can reference. Types without an entry (button, image, section,
// divider, modules) can't be used as a binding source.
export const VALUE_PROP = {
	text: 'content',
	textfield: 'defaultValue',
	number: 'defaultValue',
	date: 'defaultValue',
	options: 'defaultValue',
	labelSelector: 'selectedLabelId',
	variable: 'value'
};

// The data type of that value — keeps bindings sensible. Text can absorb any
// other type (everything can be stringified); number and date are stricter
// about what can feed them. Variables don't have a single static type here —
// see valueTypeOf(), which reads their own varType instead.
export const VALUE_TYPE = {
	text: 'text',
	textfield: 'text',
	number: 'number',
	date: 'date',
	options: 'text',
	labelSelector: 'text'
};

// A stand-in stored as a variable's defaultValue (or embedded as an
// expression chip's sourceId) meaning "don't use a fixed value — compute it
// fresh every time this is read." Currently the only method is a date's
// current-time.
export const NOW_SENTINEL = '__now__';

export function nowValue() {
	return new Date().toISOString().slice(0, 10);
}

// A page-level variable, dressed up as a tiny pseudo-element so it can flow
// through the exact same resolveProp/sourceCandidates machinery as a real
// component — element.id is unique across both spaces, so no collision risk.
// A defaultValue of NOW_SENTINEL resolves to the live date on every read,
// since this wrapper (and its props.value) is rebuilt fresh each call.
function variableAsSource(v) {
	const value = v.defaultValue === NOW_SENTINEL ? nowValue() : v.defaultValue;
	return { id: v.id, name: v.name, type: 'variable', varType: v.type, props: { value }, bindings: {} };
}

// Every component AND every variable that can serve as a value source.
export function allValueSources() {
	return [...allElements(), ...doc.variables.map(variableAsSource)];
}

// Not a component or variable — a computed value offered in the "Methods"
// group of a date field's picker, resolved fresh every time it's read (see
// sourceValue) rather than stored anywhere.
export const METHOD_SOURCES = [{ id: NOW_SENTINEL, name: 'Current time', type: 'method', varType: 'date' }];

// A source's data type — VALUE_TYPE for a real component, its own varType
// for a variable or method (neither is fixed per "type" the way a
// component's is).
export function valueTypeOf(el) {
	if (!el) return undefined;
	if (el.type === 'variable' || el.type === 'method') return el.varType;
	return VALUE_TYPE[el.type];
}

export function getFieldType(elementType, fieldKey) {
	if (fieldKey === 'hidden' || fieldKey === 'disabled') return 'boolean';
	if (fieldKey === 'defaultValue') return VALUE_TYPE[elementType] ?? 'text';
	return 'text'; // 'content' and anything else static/text-shaped
}

function hasValue(el) {
	return VALUE_PROP[el.type] !== undefined;
}

// Elements (and variables) that can feed an expression chip in a field of a
// given type. Text fields accept any type of source (a number or a date
// reads fine as text). Number fields only accept other numbers. Date fields
// accept other dates (as the base) plus numbers (as a day offset).
export function sourceCandidates(selfId, valueType) {
	const base = allValueSources().filter((el) => {
		if (el.id === selfId) return false;
		const t = valueTypeOf(el);
		if (!t) return false;
		if (valueType === 'text') return true;
		if (valueType === 'date') return t === 'date' || t === 'number';
		return t === valueType;
	});
	// Methods are computed, not stored — only offered where they actually
	// apply (currently just date fields).
	return valueType === 'date' ? [...base, ...METHOD_SOURCES] : base;
}

// Any value-producing element or variable, regardless of type — used for
// condition rules, where the comparison just needs a value to test.
export function anySourceCandidates(selfId) {
	return allValueSources().filter((el) => el.id !== selfId && hasValue(el));
}

function findElement(id) {
	return METHOD_SOURCES.find((m) => m.id === id) ?? allValueSources().find((el) => el.id === id) ?? null;
}

function sourceValue(id, seen) {
	if (id === NOW_SENTINEL) return nowValue();
	const src = findElement(id);
	const key = src && VALUE_PROP[src.type];
	if (!key) return undefined;
	return resolveProp(src, key, seen);
}

function evalExpression(fieldType, parts, seen) {
	if (!parts || !parts.length) return '';

	if (fieldType === 'number') {
		let sum = 0;
		for (const p of parts) {
			const raw = p.type === 'ref' ? sourceValue(p.sourceId, seen) : p.value;
			sum += Number(raw) || 0;
		}
		return String(sum);
	}

	if (fieldType === 'date') {
		let base = null;
		let days = 0;
		for (const p of parts) {
			if (p.type === 'literal') {
				if (p.value !== '' && !Number.isNaN(Number(p.value))) days += Number(p.value);
				continue;
			}
			const src = findElement(p.sourceId);
			if (valueTypeOf(src) === 'date' && base === null) base = sourceValue(p.sourceId, seen);
			else if (valueTypeOf(src) === 'number') days += Number(sourceValue(p.sourceId, seen)) || 0;
		}
		if (!base) return '';
		const d = new Date(base);
		if (Number.isNaN(d.getTime())) return '';
		d.setDate(d.getDate() + days);
		return d.toISOString().slice(0, 10);
	}

	// text (and options' text-shaped default value): straight concatenation,
	// in the order the parts were typed/inserted.
	return parts.map((p) => (p.type === 'ref' ? (sourceValue(p.sourceId, seen) ?? '') : (p.value ?? ''))).join('');
}

const OPERATOR_LABELS = {
	equals: 'equals',
	notEquals: 'does not equal',
	contains: 'contains',
	startsWith: 'starts with',
	endsWith: 'ends with',
	greaterThan: 'greater than',
	lessThan: 'less than',
	greaterOrEqual: 'greater than or equal to',
	lessOrEqual: 'less than or equal to',
	after: 'is after',
	before: 'is before',
	isEmpty: 'is empty',
	isNotEmpty: 'is not empty'
};

function ops(...values) {
	return values.map((value) => ({ value, label: OPERATOR_LABELS[value] }));
}

const TEXT_OPERATORS = ops('equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty');
const NUMBER_OPERATORS = ops(
	'equals',
	'notEquals',
	'greaterThan',
	'lessThan',
	'greaterOrEqual',
	'lessOrEqual',
	'isEmpty',
	'isNotEmpty'
);
const DATE_OPERATORS = ops('equals', 'notEquals', 'after', 'before', 'isEmpty', 'isNotEmpty');
const BOOLEAN_OPERATORS = ops('equals', 'notEquals', 'isEmpty', 'isNotEmpty');

// Which comparison operators make sense for a given source (component or
// variable) — takes the whole element since a variable's type lives on the
// instance (varType), not on a fixed per-"type" table.
export function operatorsFor(source) {
	const t = valueTypeOf(source);
	if (t === 'number') return NUMBER_OPERATORS;
	if (t === 'date') return DATE_OPERATORS;
	if (t === 'boolean') return BOOLEAN_OPERATORS;
	return TEXT_OPERATORS;
}

export function operatorNeedsValue(operator) {
	return operator !== 'isEmpty' && operator !== 'isNotEmpty';
}

function matchOne(rule, seen) {
	if (!rule.sourceId) return false;
	const src = findElement(rule.sourceId);
	const raw = sourceValue(rule.sourceId, seen);
	const op = rule.operator ?? 'equals';

	if (op === 'isEmpty') return raw === undefined || raw === null || String(raw) === '';
	if (op === 'isNotEmpty') return !(raw === undefined || raw === null || String(raw) === '');

	const type = valueTypeOf(src);

	if (type === 'number') {
		const a = Number(raw);
		const b = Number(rule.value);
		if (Number.isNaN(a) || Number.isNaN(b)) return false;
		if (op === 'equals') return a === b;
		if (op === 'notEquals') return a !== b;
		if (op === 'greaterThan') return a > b;
		if (op === 'lessThan') return a < b;
		if (op === 'greaterOrEqual') return a >= b;
		if (op === 'lessOrEqual') return a <= b;
		return false;
	}

	if (type === 'date') {
		const a = new Date(raw).getTime();
		const b = new Date(rule.value).getTime();
		if (Number.isNaN(a) || Number.isNaN(b)) return false;
		if (op === 'equals') return a === b;
		if (op === 'notEquals') return a !== b;
		if (op === 'after') return a > b;
		if (op === 'before') return a < b;
		return false;
	}

	const a = String(raw ?? '');
	const b = String(rule.value ?? '');
	if (op === 'equals') return a === b;
	if (op === 'notEquals') return a !== b;
	if (op === 'contains') return a.includes(b);
	if (op === 'startsWith') return a.startsWith(b);
	if (op === 'endsWith') return a.endsWith(b);
	return false;
}

function combineMatches(rules, combinator, seen) {
	if (!rules.length) return false;
	return combinator === 'OR' ? rules.some((r) => matchOne(r, seen)) : rules.every((r) => matchOne(r, seen));
}

function evalCondition(fieldType, binding, seen) {
	if (fieldType === 'boolean') {
		return combineMatches(binding.rules ?? [], binding.combinator, seen) ? 'true' : 'false';
	}
	const matched = combineMatches(binding.matches ?? [], binding.combinator, seen);
	return matched ? (binding.result ?? '') : (binding.elseResult ?? '');
}

// A short, human-readable summary of an active condition, e.g. `If
// Fulfillment Method equals "pickup" → "Welcome, pickup customer!"` — shown
// in place of the field itself once a condition takes it over.
export function describeCondition(element, fieldKey) {
	const binding = element.bindings?.[fieldKey];
	if (binding?.kind !== 'condition') return '';
	const fieldType = getFieldType(element.type, fieldKey);
	const rules = fieldType === 'boolean' ? (binding.rules ?? []) : (binding.matches ?? []);

	const parts = rules.map((r) => {
		const src = findElement(r.sourceId);
		const name = src?.name ?? '…';
		const op = r.operator ?? 'equals';
		const label = OPERATOR_LABELS[op] ?? 'equals';
		return operatorNeedsValue(op) ? `${name} ${label} "${r.value || '…'}"` : `${name} ${label}`;
	});
	const joiner = binding.combinator === 'OR' ? ' or ' : ' and ';
	const cond = parts.length ? parts.join(joiner) : '…';
	return fieldType === 'boolean' ? `If ${cond}` : `If ${cond} → "${binding.result || '…'}"`;
}

// Resolves the effective value of element.props[key]: a live Preview-only
// override (set by a button's click event) wins first, then a dynamic
// binding, then the static prop as-is. `seen` guards against circular
// references (A pulls from B which pulls from A).
export function resolveProp(element, key, seen = new Set()) {
	const override = previewOverrides[element.id]?.[key];
	if (override !== undefined) return override;

	const raw = element.props?.[key];
	const binding = element.bindings?.[key];
	if (!binding) return raw;

	const cacheKey = `${element.id}:${key}`;
	if (seen.has(cacheKey)) return raw;
	seen.add(cacheKey);

	const fieldType = getFieldType(element.type, key);
	if (binding.kind === 'expression') return evalExpression(fieldType, binding.parts, seen);
	if (binding.kind === 'condition') return evalCondition(fieldType, binding, seen);
	return raw;
}
