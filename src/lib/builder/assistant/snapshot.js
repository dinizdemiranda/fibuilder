// Builds a compact text description of the current page for the assistant's
// system message — rebuilt fresh every round rather than exposed as a "read"
// tool, so the model always has current grounding without an extra
// round-trip (see the plan's "context strategy" section). Browser-only: this
// reads the live, reactive `doc`.

import { availableDataSources } from '../projects.js';
import { getLabelById } from '../labels.js';
import { describeEvent, describeSelectEvent } from '../events.js';

const MAX_ELEMENTS = 300;

function fieldSummary(element, key) {
	const binding = element.bindings?.[key];
	if (binding?.kind === 'expression') {
		if (binding.parts.some((p) => p.type === 'formula')) return '<formula>';
		if (binding.parts.some((p) => p.type === 'ref')) return '<reference>';
	}
	if (binding?.kind === 'condition') return '<condition>';
	const raw = element.props?.[key];
	if (raw === '' || raw === null || raw === undefined) return null;
	return typeof raw === 'string' ? `"${raw}"` : JSON.stringify(raw);
}

// A short, type-specific inline description of what makes this element
// worth knowing about — not every prop, just enough for the model to
// understand what's there without needing to ask.
function describeProps(element) {
	const p = element.props ?? {};
	const parts = [];
	const add = (label, value) => {
		if (value !== null && value !== undefined && value !== '') parts.push(`${label}=${value}`);
	};
	switch (element.type) {
		case 'text':
			add('content', fieldSummary(element, 'content'));
			add('variant', p.variant);
			break;
		case 'textfield':
			add('label', fieldSummary(element, 'label') ?? `"${p.label ?? ''}"`);
			add('default', fieldSummary(element, 'defaultValue'));
			add('required', p.required || null);
			break;
		case 'number':
			add('label', `"${p.label ?? ''}"`);
			add('mode', p.mode);
			add('default', fieldSummary(element, 'defaultValue'));
			add('range', p.mode !== 'input' || p.min !== 0 || p.max !== 100 ? `${p.min}-${p.max} step ${p.step}` : null);
			break;
		case 'date':
			add('label', `"${p.label ?? ''}"`);
			add('mode', p.mode);
			add('default', fieldSummary(element, 'defaultValue'));
			break;
		case 'options':
			add('label', `"${p.label ?? ''}"`);
			add('mode', p.mode);
			if (p.sourceMode === 'mapped') add('mapped', `${p.mappedSourceId ?? '?'}.${p.mappedColumn ?? '?'}`);
			else add('choices', JSON.stringify(p.options));
			add('default', fieldSummary(element, 'defaultValue'));
			break;
		case 'button':
			add('label', `"${p.label ?? ''}"`);
			add('style', p.variant);
			break;
		case 'image':
			add('src', fieldSummary(element, 'src'));
			break;
		case 'section':
			add('direction', element.direction);
			add('justify', element.justify);
			add('align', element.align);
			add('gap', element.gap);
			break;
		case 'grid':
			add('size', `${element.columns}x${element.rows}`);
			break;
		case 'labelSelector':
			add('label', element.props.selectedLabelId ? getLabelById(element.props.selectedLabelId)?.name : null);
			break;
		case 'dataLookup':
		case 'gallery':
			add('dataSource', p.dataSourceId);
			if (element.type === 'gallery') add('layout', p.cardLayout);
			break;
	}
	return parts.length ? ` (${parts.join(', ')})` : '';
}

function describeElementEvents(element) {
	if (!element.events?.length) return [];
	return element.events.map((ev) => `  -> ${ev.trigger === 'select' ? describeSelectEvent(ev) : describeEvent(ev)}`);
}

function walk(list, depth, lines, counter) {
	for (const element of list) {
		if (!element) continue; // empty grid slot
		if (counter.n >= MAX_ELEMENTS) {
			lines.push(`${'  '.repeat(depth)}...and more elements (truncated)`);
			return;
		}
		counter.n++;
		const indent = '  '.repeat(depth);
		lines.push(`${indent}[${element.id}] ${element.type} "${element.name}"${describeProps(element)}`);
		for (const line of describeElementEvents(element)) lines.push(indent + line);
		if (element.type === 'section' || element.type === 'grid') walk(element.children, depth + 1, lines, counter);
	}
}

function describeVariable(v) {
	const binding = v.bindings?.value;
	let value;
	if (binding?.kind === 'expression') {
		value = binding.parts.some((p) => p.type === 'formula') ? '<formula>' : '<reference>';
	} else if (binding?.kind === 'condition') {
		value = '<condition>';
	} else {
		value = v.props?.value ?? '';
	}
	return `  [${v.id}] ${v.name}: ${v.type} = ${value}`;
}

export function buildDocSnapshot(doc) {
	const lines = [];
	lines.push(`Page: "${doc.page.title}" (${doc.page.columns} column${doc.page.columns === 2 ? 's' : ''})`);

	const counter = { n: 0 };
	lines.push('Column A:');
	if (doc.elements.length === 0) lines.push('  (empty)');
	else walk(doc.elements, 1, lines, counter);

	if (doc.page.columns === 2) {
		lines.push('Column B:');
		if (doc.elementsB.length === 0) lines.push('  (empty)');
		else walk(doc.elementsB, 1, lines, counter);
	}

	lines.push('Variables:');
	if (doc.variables.length === 0) lines.push('  (none)');
	else for (const v of doc.variables) lines.push(describeVariable(v));

	const sources = availableDataSources();
	lines.push('Data sources available in this project:');
	if (sources.length === 0) lines.push('  (none)');
	else for (const s of sources) lines.push(`  ${s.id} "${s.name}" — columns: ${s.columns.join(', ')}`);

	lines.push('Labels imported:');
	if (doc.labels.length === 0) lines.push('  (none)');
	else for (const id of doc.labels) lines.push(`  [${id}] ${getLabelById(id)?.name ?? id}`);

	return lines.join('\n');
}
