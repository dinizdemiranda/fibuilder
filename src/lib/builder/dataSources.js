import orders from '../../data/mock_db/orders.json';
import packages from '../../data/mock_db/packages.json';
import replacementOrders from '../../data/mock_db/replacement_orders.json';
import returns from '../../data/mock_db/returns.json';

// Each mock_db file stands in for a query against a real data source — same
// name/description/rows shape, so the UI just needs a thin, uniform wrapper
// (columns are derived from the first row rather than authored separately).
function normalize(id, data) {
	return {
		id,
		name: data.name,
		description: data.description,
		columns: Object.keys(data.rows[0] ?? {}),
		rows: data.rows
	};
}

export const dataSources = [
	normalize('orders', orders),
	normalize('packages', packages),
	normalize('replacement_orders', replacementOrders),
	normalize('returns', returns)
];

export function getDataSourceById(id) {
	return dataSources.find((d) => d.id === id) ?? null;
}

// Distinct values of one column, in first-seen order — the choice list for
// an Options component mapped to a data source.
export function uniqueColumnValues(source, column) {
	if (!source || !column) return [];
	const seen = new Set();
	const out = [];
	for (const row of source.rows) {
		const v = row[column];
		if (v === null || v === undefined) continue;
		const s = String(v);
		if (!seen.has(s)) {
			seen.add(s);
			out.push(s);
		}
	}
	return out;
}

// An Options element's actual choice list, whichever source it's configured
// to use — the one place that needs to know about both modes, so nothing
// else has to.
export function effectiveOptionsFor(element) {
	if (element.props.sourceMode === 'mapped') {
		return uniqueColumnValues(getDataSourceById(element.props.mappedSourceId), element.props.mappedColumn);
	}
	return element.props.options ?? [];
}
