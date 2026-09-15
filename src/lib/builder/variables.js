// Page-level variables: named runtime values that don't live on any one
// component. They're browsable/editable in the Data tab, and — via
// bindings.js's allValueSources() — selectable anywhere a component's value
// can be referenced (Value/Default Value fields, conditions, filters), and
// settable through a button's "Set variable" event.
//
// A variable's own value is stored the exact same way a component's field
// is — `props.value` (a static literal) optionally overridden by
// `bindings.value` (an expression/condition) — so the same ExpressionField/
// DynamicValueField UI that edits a component's field edits a variable's
// value too, no separate mechanism needed. See bindings.js's
// variableAsSource(), which relabels a variable's `type` (its data type:
// string/number/boolean/date) as `varType` and exposes a fixed `type:
// 'variable'` so it slots into the generic element-shaped machinery.

import { doc } from './state.svelte.js';

export const VARIABLE_TYPES = [
	{ value: 'string', label: 'String', icon: 'text' },
	{ value: 'number', label: 'Number', icon: 'number' },
	{ value: 'boolean', label: 'Boolean', icon: 'checkbox' },
	{ value: 'date', label: 'Date', icon: 'calendar' }
];

export function typeIcon(type) {
	return VARIABLE_TYPES.find((t) => t.value === type)?.icon ?? 'text';
}

export function defaultValueFor(type) {
	return type === 'boolean' ? 'false' : '';
}

export function uniqueVariableName(base) {
	const existing = new Set(doc.variables.map((v) => v.name));
	if (!existing.has(base)) return base;
	let n = 2;
	while (existing.has(`${base} ${n}`)) n += 1;
	return `${base} ${n}`;
}

export function isVariableNameTaken(name, excludeId = null) {
	return doc.variables.some((v) => v.id !== excludeId && v.name === name);
}

export function createVariable({ name, type, value }) {
	const variable = {
		id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name,
		type,
		props: { value: value ?? defaultValueFor(type) },
		bindings: {}
	};
	doc.variables.push(variable);
	return variable;
}

export function removeVariable(id) {
	const i = doc.variables.findIndex((v) => v.id === id);
	if (i !== -1) doc.variables.splice(i, 1);
}

export function getVariableById(id) {
	return doc.variables.find((v) => v.id === id) ?? null;
}

// Every other-variable id this variable's *current* value binding depends
// on directly — an expression's ref/formula-ref parts, or a condition's
// rule sources. A plain literal (no binding) or a dependency on a
// component (not another variable) contributes nothing here; components
// are always a dead end for a variable-to-variable loop.
function directDependencyIds(v) {
	const binding = v.bindings?.value;
	if (!binding) return [];
	const ids = [];
	if (binding.kind === 'expression') {
		for (const p of binding.parts ?? []) {
			if (p.type === 'ref') ids.push(p.sourceId);
			else if (p.type === 'formula') ids.push(...Object.values(p.formula?.refs ?? {}));
		}
	} else if (binding.kind === 'condition') {
		for (const r of binding.rules ?? binding.matches ?? []) if (r.sourceId) ids.push(r.sourceId);
	}
	return ids;
}

// True if `variableId` currently sits on a dependency loop through other
// variables' own values — A depends on B, B depends back on A, even
// through several hops. Checked live (there's no separate "save" step to
// gate anymore — the value field edits doc.variables directly, the same
// way a component's field does), so callers show this as a standing
// warning rather than a blocked action; resolveProp's own seen-guard is
// what actually keeps a real loop from hanging at render time regardless.
export function variableInCycle(variableId) {
	const visited = new Set();
	function reaches(fromId, targetId) {
		if (visited.has(fromId)) return false;
		visited.add(fromId);
		const v = getVariableById(fromId);
		if (!v) return false;
		for (const depId of directDependencyIds(v)) {
			if (depId === targetId || reaches(depId, targetId)) return true;
		}
		return false;
	}
	const v = getVariableById(variableId);
	if (!v) return false;
	for (const depId of directDependencyIds(v)) {
		if (depId === variableId || reaches(depId, variableId)) return true;
	}
	return false;
}
