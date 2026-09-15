// Gallery module: a grid of repeated tiles, one per row of a mapped data
// source. Every tile shares the same fixed set of possible fields —
// thumbnail, title, subtitle, tag, featuredText — each independently
// toggleable and freely reorderable (see GalleryProperties.svelte's drag
// handles). Tag and featuredText are the one exception: whenever both are
// enabled they always render together on one row ("$12 · In stock" style),
// wherever the first of the pair falls in the order — see buildCardRows().
//
// Each field is a little template applied to every row: `parts` is the same
// literal/ref concatenation idea as ExpressionField.svelte, just with two
// kinds of chip instead of one — 'column' (that row's value for one of the
// data source's columns) and 'variable' (a page variable, same for every
// row) — plus plain 'literal' text.

import { doc } from './state.svelte.js';
import { resolveProp, variableAsSource } from './bindings.js';

export const GALLERY_CARD_LAYOUTS = [
	{ value: 'vertical', label: 'Vertical' },
	{ value: 'horizontal', label: 'Horizontal' },
	{ value: 'auto', label: 'Auto' }
];

export const GALLERY_FIELD_DEFS = {
	thumbnail: { label: 'Thumbnail', kind: 'image' },
	title: { label: 'Title', kind: 'text' },
	subtitle: { label: 'Subtitle', kind: 'text' },
	tag: { label: 'Tag', kind: 'text' },
	featuredText: { label: 'Featured Text', kind: 'text' }
};

// Shown on the canvas only, whenever a field's template resolves empty —
// purely so an unconfigured card still previews sensibly. Preview always
// shows real data and hides an empty field's row entirely instead.
export const GALLERY_SAMPLE_VALUES = {
	title: 'Lorem Ipsum',
	subtitle: 'Dolor sit amet, consectetur adipiscing elit',
	tag: 'NEW',
	featuredText: '$99'
};

export function defaultGalleryFields() {
	return Object.keys(GALLERY_FIELD_DEFS).map((key) => ({ key, enabled: true, parts: [] }));
}

function resolvePart(part, row) {
	if (part.type === 'literal') return part.value ?? '';
	if (part.type === 'column') return row ? String(row[part.column] ?? '') : '';
	if (part.type === 'variable') {
		const v = doc.variables.find((x) => x.id === part.variableId);
		if (!v) return '';
		return resolveProp(variableAsSource(v), 'value') ?? '';
	}
	return '';
}

// Concatenates a field's parts against one data row — the template
// evaluator, run fresh for every tile.
export function resolveGalleryField(parts, row) {
	if (!parts || parts.length === 0) return '';
	return parts.map((p) => resolvePart(p, row)).join('');
}

// Walks the enabled fields in their current order and groups tag+featuredText
// onto a single combined row wherever the first of the pair appears —
// everything else gets its own row, in order. `fields` must already be
// filtered to enabled-only, in display order.
export function buildCardRows(fields) {
	const used = new Set();
	const rows = [];
	for (let i = 0; i < fields.length; i++) {
		if (used.has(i)) continue;
		const f = fields[i];
		if (f.key === 'tag' || f.key === 'featuredText') {
			const pairKey = f.key === 'tag' ? 'featuredText' : 'tag';
			const pairIdx = fields.findIndex((x, j) => j > i && x.key === pairKey && !used.has(j));
			if (pairIdx !== -1) {
				used.add(pairIdx);
				rows.push({ type: 'pair', fields: [f, fields[pairIdx]] });
				continue;
			}
		}
		rows.push({ type: 'single', fields: [f] });
	}
	return rows;
}
