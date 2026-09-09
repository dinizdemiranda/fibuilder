// Button click events: either "control another component" or "set a page
// variable." Each event on element.events is { id, trigger: 'click', action,
// ...action-specific fields }. For 'controlComponent' that's { targetId,
// method, direction, props: { value }, bindings: { value? } }; for
// 'setVariable' it's { variableId, varMethod, props: { value }, bindings }.
// The props/bindings pair deliberately mirrors a regular element's shape so
// the "set value" field can reuse ExpressionField/resolveProp exactly like
// any other Value field — the event object itself just stands in as a tiny
// pseudo-element.

import { allElements, setPreviewOverride, clearPreviewOverride, triggerPreviewCommand, doc } from './state.svelte.js';
import { resolveProp, VALUE_PROP } from './bindings.js';

// Which control methods make sense for each controllable component type.
// Types with no entry here (button, image, divider, section, labelPreview)
// aren't offered as "Control component" targets at all.
export const CONTROL_METHODS = {
	textfield: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	number: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	date: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	options: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	text: ['setValue', 'toggleVisibility'],
	labelSelector: ['setValue'],
	dataLookup: ['refresh', 'resetFilters']
};

export const METHOD_LABELS = {
	clearValue: 'Clear value',
	setValue: 'Set value',
	toggleEnabled: 'Disable/Enable',
	toggleVisibility: 'Show/Hide',
	refresh: 'Refresh',
	resetFilters: 'Reset filters'
};

export const VARIABLE_METHOD_LABELS = {
	set: 'Set',
	clear: 'Clear',
	resetToDefault: 'Reset to default'
};

export function controlTargetCandidates(selfId) {
	return allElements().filter((el) => el.id !== selfId && CONTROL_METHODS[el.type]);
}

// Components that can have their value set directly — the target list for a
// Data Lookup's "On Select → set a field" event, which only ever writes a
// value (no clear/toggle/etc.).
export function setValueTargetCandidates(selfId) {
	return allElements().filter((el) => el.id !== selfId && CONTROL_METHODS[el.type]?.includes('setValue'));
}

function findElement(id) {
	return allElements().find((el) => el.id === id) ?? null;
}

function findVariable(id) {
	return doc.variables.find((v) => v.id === id) ?? null;
}

// A short, human-readable summary shown in the events table.
export function describeEvent(event) {
	if (event.action === 'setVariable') {
		const variable = findVariable(event.variableId);
		const name = variable?.name ?? '…';
		const methodLabel = VARIABLE_METHOD_LABELS[event.varMethod] ?? '…';
		return `On Click → Variable "${name}": ${methodLabel}`;
	}

	const target = findElement(event.targetId);
	const name = target?.name ?? '…';

	if (event.method === 'toggleEnabled') return `On Click → ${target ? `"${name}"` : '…'}: ${event.direction === 'enable' ? 'Enable' : 'Disable'}`;
	if (event.method === 'toggleVisibility') return `On Click → ${target ? `"${name}"` : '…'}: ${event.direction === 'hide' ? 'Hide' : 'Show'}`;
	if (event.method) return `On Click → ${target ? `"${name}"` : '…'}: ${METHOD_LABELS[event.method] ?? event.method}`;
	return 'On Click → …';
}

// Actually runs the event against Preview's live render — see
// state.svelte.js's previewOverrides/previewCommands and bindings.js's
// resolveProp, which checks overrides before anything else.
export function runEvent(event) {
	if (event.action === 'setVariable') {
		if (!event.variableId || !event.varMethod) return;
		const variable = findVariable(event.variableId);
		if (!variable) return;
		if (event.varMethod === 'set') {
			setPreviewOverride(variable.id, 'value', resolveProp(event, 'value'));
		} else if (event.varMethod === 'clear') {
			setPreviewOverride(variable.id, 'value', variable.type === 'boolean' ? 'false' : '');
		} else if (event.varMethod === 'resetToDefault') {
			clearPreviewOverride(variable.id, 'value');
		}
		return;
	}

	if (event.action !== 'controlComponent' || !event.targetId || !event.method) return;
	const target = findElement(event.targetId);
	if (!target) return;

	if (event.method === 'clearValue') {
		const key = VALUE_PROP[target.type];
		if (key) setPreviewOverride(target.id, key, '');
	} else if (event.method === 'setValue') {
		const key = VALUE_PROP[target.type];
		if (key) setPreviewOverride(target.id, key, resolveProp(event, 'value'));
	} else if (event.method === 'toggleEnabled') {
		setPreviewOverride(target.id, 'disabled', event.direction === 'enable' ? 'false' : 'true');
	} else if (event.method === 'toggleVisibility') {
		setPreviewOverride(target.id, 'hidden', event.direction === 'hide' ? 'true' : 'false');
	} else if (event.method === 'refresh' || event.method === 'resetFilters') {
		triggerPreviewCommand(target.id, event.method);
	}
}

// A short, human-readable summary for a Data Lookup's "On Select" events.
export function describeSelectEvent(event) {
	const columnPart = event.column ? `column "${event.column}"` : '…';
	if (event.action === 'setVariable') {
		const variable = findVariable(event.variableId);
		return `On Select → Variable "${variable?.name ?? '…'}" = ${columnPart}`;
	}
	const target = findElement(event.targetId);
	return `On Select → "${target?.name ?? '…'}" = ${columnPart}`;
}

// Runs every "On Select" event on a Data Lookup against the row that was
// just selected — the value always comes straight from that row's column,
// never from resolveProp/ExpressionField the way button events do.
export function runRowSelectEvents(element, row) {
	if (!row) return;
	for (const event of element.events ?? []) {
		if (event.trigger !== 'select' || !event.column) continue;
		const value = row[event.column] ?? '';

		if (event.action === 'setVariable') {
			if (!event.variableId) continue;
			const variable = findVariable(event.variableId);
			if (variable) setPreviewOverride(variable.id, 'value', value);
		} else if (event.action === 'controlComponent') {
			if (!event.targetId) continue;
			const target = findElement(event.targetId);
			const key = target && VALUE_PROP[target.type];
			if (key) setPreviewOverride(target.id, key, value);
		}
	}
}
