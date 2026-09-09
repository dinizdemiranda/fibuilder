// Data Lookup module: renders a chosen mock data source as a table, with an
// optional set of filters the user can run against it. A filter's comparison
// value is either typed in directly ('static') or read live from another
// canvas component ('reference') — e.g. "only show rows where order_id
// equals whatever's currently in the Order ID field." Filtering only ever
// happens when the module's "Update" button is clicked (see
// DataLookupElement.svelte) — never automatically as a referenced field
// changes, matching a real "type it in, then refresh" workflow.

import { clearPreviewOverride } from './state.svelte.js';
import { resolveProp, VALUE_PROP, allValueSources } from './bindings.js';

export const FILTER_OPERATORS = [
	{ value: 'equals', label: 'equals' },
	{ value: 'notEquals', label: 'does not equal' },
	{ value: 'contains', label: 'contains' },
	{ value: 'startsWith', label: 'starts with' },
	{ value: 'endsWith', label: 'ends with' },
	{ value: 'greaterThan', label: 'greater than' },
	{ value: 'lessThan', label: 'less than' },
	{ value: 'greaterOrEqual', label: 'greater than or equal to' },
	{ value: 'lessOrEqual', label: 'less than or equal to' },
	{ value: 'between', label: 'is between' },
	{ value: 'isEmpty', label: 'is empty' },
	{ value: 'isNotEmpty', label: 'is not empty' }
];

export function operatorNeedsValue(operator) {
	return operator !== 'isEmpty' && operator !== 'isNotEmpty';
}

export function operatorNeedsSecondValue(operator) {
	return operator === 'between';
}

// Any value-producing element or variable — the candidate list for a
// filter's "reference" value mode.
export function filterSourceCandidates() {
	return allValueSources().filter((el) => VALUE_PROP[el.type] !== undefined);
}

function findElement(id) {
	return allValueSources().find((el) => el.id === id) ?? null;
}

// Reads a filter's comparison value at the moment it's called — 'which' is
// '' for the primary value or '2' for a "between" upper bound.
function resolveFilterValue(filter, which) {
	if ((filter.valueMode ?? 'static') === 'reference') {
		const src = findElement(filter[`sourceId${which}`]);
		const key = src && VALUE_PROP[src.type];
		return key ? (resolveProp(src, key) ?? '') : '';
	}
	return filter[`value${which}`] ?? '';
}

function isBlank(v) {
	return v === null || v === undefined || String(v) === '';
}

function matchRow(row, filter) {
	if (!filter.column) return true;
	const raw = row[filter.column];
	const op = filter.operator ?? 'equals';

	if (op === 'isEmpty') return isBlank(raw);
	if (op === 'isNotEmpty') return !isBlank(raw);

	const cmp = resolveFilterValue(filter, '');

	if (op === 'between') {
		const cmp2 = resolveFilterValue(filter, '2');
		const a = Number(raw);
		const lo = Number(cmp);
		const hi = Number(cmp2);
		if (!Number.isNaN(a) && !Number.isNaN(lo) && !Number.isNaN(hi)) {
			return a >= Math.min(lo, hi) && a <= Math.max(lo, hi);
		}
		const s = String(raw ?? '');
		const [sLo, sHi] = String(cmp ?? '') <= String(cmp2 ?? '') ? [cmp, cmp2] : [cmp2, cmp];
		return s >= String(sLo ?? '') && s <= String(sHi ?? '');
	}

	const numA = Number(raw);
	const numB = Number(cmp);
	const bothNumeric = !isBlank(raw) && !isBlank(cmp) && !Number.isNaN(numA) && !Number.isNaN(numB);
	const strA = String(raw ?? '').toLowerCase();
	const strB = String(cmp ?? '').toLowerCase();

	switch (op) {
		case 'equals':
			return bothNumeric ? numA === numB : strA === strB;
		case 'notEquals':
			return bothNumeric ? numA !== numB : strA !== strB;
		case 'contains':
			return strA.includes(strB);
		case 'startsWith':
			return strA.startsWith(strB);
		case 'endsWith':
			return strA.endsWith(strB);
		case 'greaterThan':
			return bothNumeric ? numA > numB : strA > strB;
		case 'lessThan':
			return bothNumeric ? numA < numB : strA < strB;
		case 'greaterOrEqual':
			return bothNumeric ? numA >= numB : strA >= strB;
		case 'lessOrEqual':
			return bothNumeric ? numA <= numB : strA <= strB;
		default:
			return true;
	}
}

// A filter only actually narrows the results once it has a column AND (for
// operators that need one) a non-blank comparison value — clearing a
// referenced field back to empty, or an empty static value, quietly drops
// the filter instead of matching "equals nothing."
function isFilterActive(filter) {
	if (!filter.column) return false;
	const op = filter.operator ?? 'equals';
	if (op === 'isEmpty' || op === 'isNotEmpty') return true;
	if (isBlank(resolveFilterValue(filter, ''))) return false;
	if (operatorNeedsSecondValue(op) && isBlank(resolveFilterValue(filter, '2'))) return false;
	return true;
}

// Applies every active filter to source.rows, combined with AND/OR. No
// active filters at all just returns every row.
export function filterRows(source, filters, combinator) {
	if (!source) return [];
	const active = (filters ?? []).filter(isFilterActive);
	if (!active.length) return source.rows;
	return combinator === 'OR'
		? source.rows.filter((row) => active.some((f) => matchRow(row, f)))
		: source.rows.filter((row) => active.every((f) => matchRow(row, f)));
}

// A short, human-readable summary for the minimized filter row, e.g.
// `order_id equals "Order Id Field"` or `package_sequence is between "2" and "3"`.
export function describeFilter(filter) {
	if (!filter.column) return 'New filter';
	const opLabel = FILTER_OPERATORS.find((o) => o.value === (filter.operator ?? 'equals'))?.label ?? 'equals';
	if (!operatorNeedsValue(filter.operator)) return `${filter.column} ${opLabel}`;

	const describeValue = (which) => {
		if ((filter.valueMode ?? 'static') === 'reference') {
			const src = findElement(filter[`sourceId${which}`]);
			return src ? `"${src.name}"` : '"…"';
		}
		return `"${filter[`value${which}`] || '…'}"`;
	};

	return operatorNeedsSecondValue(filter.operator)
		? `${filter.column} ${opLabel} ${describeValue('')} and ${describeValue('2')}`
		: `${filter.column} ${opLabel} ${describeValue('')}`;
}

function clearFilterSource(sourceId) {
	if (!sourceId) return;
	const src = findElement(sourceId);
	const key = src && VALUE_PROP[src.type];
	if (key) clearPreviewOverride(src.id, key);
}

// "Reset filters": puts every reference-mode filter's source component back
// to its bound/static value — static filters have nothing to reset, since
// their value only ever changes via the properties panel.
export function resetFilterSources(filters) {
	for (const filter of filters ?? []) {
		if ((filter.valueMode ?? 'static') !== 'reference') continue;
		clearFilterSource(filter.sourceId);
		if (operatorNeedsSecondValue(filter.operator)) clearFilterSource(filter.sourceId2);
	}
}
