// Page-level variables: named runtime values that don't live on any one
// component. They're browsable/editable in the Data tab, and — via
// bindings.js's allValueSources() — selectable anywhere a component's value
// can be referenced (Value/Default Value fields, conditions, filters), and
// settable through a button's "Set variable" event.

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

export function createVariable({ name, type, defaultValue }) {
	const variable = {
		id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name,
		type,
		defaultValue
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
