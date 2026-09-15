// "Recent projects": a hardcoded, in-memory-only stand-in for switching
// between client accounts in a demo. There's no backend and nothing here is
// persisted — switching projects just reloads doc with a different set of
// imported labels/data sources and wipes the canvas, the same way Clear
// canvas does. Any changes the user makes are gone the moment they switch
// away (or reload), by design.

import { doc, clearCanvas } from './state.svelte.js';
import { labelDefinitions } from './labels.js';
import { dataSources } from './dataSources.js';

export const PROJECTS = [
	{
		id: 'logistics',
		name: 'Logistics',
		labelIds: labelDefinitions.map((l) => l.id),
		dataSourceIds: dataSources.map((d) => d.id)
	},
	{
		id: 'retail',
		name: 'Retail',
		// Labels still TBD — the retail-flavored label set this project
		// would actually use hasn't been authored yet.
		labelIds: [],
		dataSourceIds: ['bakery']
	}
];

export function getProjectById(id) {
	return PROJECTS.find((p) => p.id === id) ?? null;
}

export function loadProject(id) {
	const project = getProjectById(id);
	if (!project || project.id === doc.activeProjectId) return;
	clearCanvas();
	doc.activeProjectId = project.id;
	doc.labels = [...project.labelIds];
	doc.dataSourceIds = [...project.dataSourceIds];
}

// The data sources actually available in the active project. dataSources.js
// itself stays a flat global catalog (like labels.js's labelDefinitions) —
// doc.dataSourceIds is the "imported" subset, mirroring how doc.labels
// already works relative to labelDefinitions.
export function availableDataSources() {
	return dataSources.filter((d) => doc.dataSourceIds.includes(d.id));
}
