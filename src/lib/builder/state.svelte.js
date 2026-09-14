import { blockDefs } from './types.js';
import { labelDefinitions } from './labels.js';
import { dataSources } from './dataSources.js';
import { defaultGrid } from './columnGrid.js';

let idCounter = 0;
function nextId(type) {
	idCounter += 1;
	return `${type}_${idCounter}`;
}

export const doc = $state({
	activeProjectId: 'logistics',
	page: {
		title: 'Untitled Page',
		background: '#ffffff',
		primaryColor: '#0b57d0',
		cornerRadius: 8,
		orientation: 'landscape', // 'portrait' | 'landscape'
		pageSize: '1280x800', // one of PAGE_SIZE_PRESETS' ids (layout.js) — the design canvas's fixed page size
		columns: 1, // 1 | 2
		columnRatio: '6/6', // '<a>/<b>' in twelfths, a+b === 12 — only used when columns === 2
		colAWidthMode: 'fill', // 'fill' | 'auto' — 'auto' shrinks the column to its content's own width, floored at 1/6 of the page
		colBWidthMode: 'fill',
		showColumnDivider: false,
		scrollIndependently: false, // only meaningful when columns === 2 — each column gets its own scrollbar
		// Column-level settings — shaped like a real element (id/type/props/
		// bindings) on purpose, so VisibilityFields/DynamicValueField/
		// resolveProp (all generic over that shape) work on a column with no
		// special-casing. 'column' isn't a real blockDefs type — getFieldType
		// (bindings.js) only branches on fieldKey for 'hidden'/'disabled'
		// anyway, so that's never an issue.
		colA: { id: 'col-a', type: 'column', props: { background: '', hidden: 'false', disabled: 'false' }, bindings: {} },
		colB: { id: 'col-b', type: 'column', props: { background: '', hidden: 'false', disabled: 'false' }, bindings: {} },
		footer: {
			hidden: true,
			showSecondary: true,
			showText: true,
			secondaryLabel: 'Cancel',
			textLabel: 'Skip',
			primaryLabel: 'Continue'
		}
	},
	elements: [], // column A (the only column when columns === 1)
	elementsB: [], // column B — kept even when hidden, so toggling columns doesn't lose data
	labels: labelDefinitions.map((l) => l.id), // ids of imported label_options.json definitions, in import order
	dataSourceIds: dataSources.map((d) => d.id), // ids of data sources available in the active project — see projects.js
	variables: [], // [{ id, name, type: 'string'|'number'|'boolean'|'date', defaultValue }]
	workflow: {
		connections: [], // [{ id, from: endpoint, to: endpoint }] — see workflow.js for endpoint shapes
		transforms: [], // [{ id, type, valueType, settings, x, y }] — intermediate nodes, own position lives on the record
		nodePositions: {} // 'page' | labelId -> { x, y }, in canvas space — set on first drag
	}
});

export const uiState = $state({
	selectedId: null,
	previewOpen: false,
	mode: 'design', // 'design' | 'workflow'
	// The id of the single innermost block currently under the pointer. Plain CSS
	// :hover (and even mouseenter/mouseleave) fire on every ancestor a nested
	// block sits inside, so hover state is tracked explicitly instead — see
	// CanvasBlock's mouseover/mouseout handlers.
	hoveredId: null
});

// Workflow canvas pan/zoom — view-only, never persisted with the document.
export const workflowView = $state({
	zoom: 1,
	panX: 80,
	panY: 60
});

// Page/Label node layout — see workflow.js's nodePositionFor/setNodePosition
// for the accessors (they need labelFields/ROW_H to size labels correctly,
// which would make this file import workflow.js right back).

// Shadow drag state, read synchronously by drop targets. HTML5 DnD's
// dataTransfer payload can't be read during dragover (only its type keys can),
// so this is what dragover/drop handlers actually check.
export const dragState = $state({
	kind: null, // 'new' | 'move'
	elementType: null,
	elementId: null,
	overContainerId: undefined // which FlowZone last claimed the pointer (undefined = none yet)
});

// Runtime-only overrides applied while Preview is open, e.g. a button's "Set
// value" / "Show" / "Hide" event acting on another component. Never touches
// doc — these are read by resolveProp() ahead of bindings/static props, and
// are wiped every time Preview (re)opens (see PreviewModal.svelte).
export const previewOverrides = $state({});

export function setPreviewOverride(elementId, key, value) {
	if (!previewOverrides[elementId]) previewOverrides[elementId] = {};
	previewOverrides[elementId][key] = value;
}

export function resetPreviewOverrides() {
	for (const id of Object.keys(previewOverrides)) delete previewOverrides[id];
	for (const id of Object.keys(previewCommands)) delete previewCommands[id];
}

// Reverts one element's field back to its bound/static value — e.g. "Reset
// filters" clearing whatever a user typed into a field a Data Lookup filter
// was reading from.
export function clearPreviewOverride(elementId, key) {
	if (previewOverrides[elementId]) delete previewOverrides[elementId][key];
}

// One-shot imperative commands (as opposed to a value override) fired at a
// component instance while Preview is open — e.g. a button's "Refresh" event
// telling a specific Data Lookup module to re-run its filters right now. The
// target component's own $effect watches its own id/command pair and reacts
// each time the nonce changes; the number itself carries no meaning.
export const previewCommands = $state({});

export function triggerPreviewCommand(elementId, command) {
	if (!previewCommands[elementId]) previewCommands[elementId] = {};
	previewCommands[elementId][command] = (previewCommands[elementId][command] ?? 0) + 1;
}

export function beginDragNew(type) {
	dragState.kind = 'new';
	dragState.elementType = type;
	dragState.elementId = null;
	dragState.overContainerId = undefined;
}

export function beginDragMove(element) {
	dragState.kind = 'move';
	dragState.elementType = element.type;
	dragState.elementId = element.id;
	dragState.overContainerId = undefined;
}

export function endDrag() {
	dragState.kind = null;
	dragState.elementType = null;
	dragState.elementId = null;
	dragState.overContainerId = undefined;
}

// A "root" container is a page column, not a section/grid. null = column A, 'colB' = column B.
function isRootContainerId(id) {
	return id === null || id === undefined || id === 'colB';
}

// Section and Grid are the only element types with their own `children` list
// — both are restricted to living directly in a root column (never nested
// inside each other or themselves), so they share this one check everywhere.
function isContainerType(type) {
	return type === 'section' || type === 'grid';
}

function rootListFor(containerId) {
	return containerId === 'colB' ? doc.elementsB : doc.elements;
}

function findContainerById(id) {
	return (
		doc.elements.find((el) => isContainerType(el.type) && el.id === id) ??
		doc.elementsB.find((el) => isContainerType(el.type) && el.id === id) ??
		null
	);
}

function listFor(containerId) {
	if (isRootContainerId(containerId)) return rootListFor(containerId);
	return findContainerById(containerId)?.children ?? null;
}

// Elements live at most two levels deep: a page column, or a section/grid's
// children within a column. Neither nests inside the other, so this is the
// whole search space. `owner` is the section/grid element the list belongs
// to (null for a root column) — grids need it to know whether a slot is
// cleared with `null` (preserving every other zone's position) instead of
// spliced out (which would shift them).
function locateContainer(id) {
	for (const rootList of [doc.elements, doc.elementsB]) {
		const idx = rootList.findIndex((el) => el?.id === id);
		if (idx !== -1) return { list: rootList, index: idx, element: rootList[idx], owner: null };
		for (const el of rootList) {
			if (isContainerType(el.type)) {
				const cIdx = el.children.findIndex((c) => c?.id === id);
				if (cIdx !== -1) return { list: el.children, index: cIdx, element: el.children[cIdx], owner: el };
			}
		}
	}
	return { list: null, index: -1, element: null, owner: null };
}

// Every element (component, module, section, or grid) across both columns
// and any section/grid children — the whole space element names must stay
// unique within. A grid's children array has null gaps for empty zones.
export function allElements() {
	const out = [];
	const collect = (list) => {
		for (const el of list) {
			if (!el) continue;
			out.push(el);
			if (isContainerType(el.type)) collect(el.children);
		}
	};
	collect(doc.elements);
	collect(doc.elementsB);
	return out;
}

export function isNameTaken(name, excludeId = null) {
	return allElements().some((el) => el.id !== excludeId && el.name === name);
}

// "Button" -> "Button" if free, else "Button 2", "Button 3", ...
function uniqueName(baseLabel) {
	const existing = new Set(allElements().map((el) => el.name));
	if (!existing.has(baseLabel)) return baseLabel;
	let n = 2;
	while (existing.has(`${baseLabel} ${n}`)) n += 1;
	return `${baseLabel} ${n}`;
}

export function renameElement(id, newName) {
	const trimmed = newName.trim();
	if (!trimmed || isNameTaken(trimmed, id)) return false;
	const { element } = locateContainer(id);
	if (!element) return false;
	element.name = trimmed;
	// A manual rename opts the element out of auto-naming from its Label
	// field for good — see trySyncNameFromLabel.
	element.nameAuto = false;
	return true;
}

// Keeps an element's name mirroring whatever it's labeled, right up until
// the user renames it manually (renameElement flips nameAuto off for good).
// Types with no "label" prop (text, image, section, divider, modules) just
// never trigger this, since element.props.label is undefined for them.
export function trySyncNameFromLabel(element) {
	if (!element || element.nameAuto === false) return;
	const label = element.props?.label;
	if (typeof label !== 'string') return;
	const trimmed = label.trim();
	if (!trimmed || trimmed === element.name || isNameTaken(trimmed, element.id)) return;
	element.name = trimmed;
}

export function selectedElement() {
	if (!uiState.selectedId) return null;
	return locateContainer(uiState.selectedId).element;
}

export function selectElement(id) {
	uiState.selectedId = id;
}

// A page column is selectable/hoverable like any element, but it isn't one
// — it has no entry in doc.elements/elementsB (it *is* one of those lists).
// 'col-a' | 'col-b' are reserved ids that never collide with a real element
// id (those are always `${type}_${n}`).
export function isColumnId(id) {
	return id === 'col-a' || id === 'col-b';
}

// side: 'left' | 'right' — which side of the existing sole column the new,
// empty column appears on. Column A always renders first (on the left) and
// B second, so 'left' means the *new* column becomes A and the old A
// content shifts over to become B; 'right' just brings B into view reusing
// whatever it last held (columns keep their content even while hidden, so
// switching back and forth never loses anything — same as the old
// 1/2-column toggle did).
export function addColumn(side) {
	if (side === 'left') {
		doc.elementsB = doc.elements;
		doc.elements = [];
	}
	doc.page.columns = 2;
}

// side: 'a' | 'b' — the column being removed. Its own elements are pushed
// onto the surviving column's list rather than discarded (appended after
// the survivor's own elements). Single-column mode always reads
// doc.elements, so the merged content ends up there regardless of which
// side was removed. The sole remaining column can't be removed.
export function removeColumn(side) {
	if (doc.page.columns !== 2) return;
	doc.elements = side === 'a' ? [...doc.elementsB, ...doc.elements] : [...doc.elements, ...doc.elementsB];
	doc.elementsB = [];
	doc.page.columns = 1;
	if (isColumnId(uiState.selectedId)) uiState.selectedId = null;
	if (isColumnId(uiState.hoveredId)) uiState.hoveredId = null;
}

// target: { containerId: null | 'colB' | sectionId, index }
// For a grid target, `index` addresses a specific zone directly
// (row*columns+col) rather than an array insert position — an occupied zone
// rejects a brand-new element outright (there's nothing to swap it with).
export function addElement(type, target = {}) {
	const def = blockDefs[type];
	if (!def) return null;
	let containerId = target.containerId ?? null;
	// Section/Grid can only live in a column — never inside another section or grid.
	if (isContainerType(type) && !isRootContainerId(containerId)) containerId = null;
	const container = findContainerById(containerId);
	if (container?.type === 'grid') {
		const cellIndex = target.index ?? container.children.findIndex((c) => !c);
		if (cellIndex < 0 || cellIndex >= container.children.length || container.children[cellIndex]) return null;
	} else if (!listFor(containerId)) {
		return null;
	}

	// A fresh Text Field/Number/Date/Options/Button starts named after its own
	// default Label value (e.g. "Order ID"), not the generic palette label —
	// trySyncNameFromLabel keeps it in sync as that field changes, until the
	// user renames the element manually.
	const name = uniqueName(def.defaultProps?.label || def.label);
	// Every component (not module) gets shared hidden/disabled fields — plain
	// text for now ("true"/"false"), holding room for conditions later.
	const visibilityProps = def.category === 'component' ? { hidden: 'false', disabled: 'false' } : {};
	const el =
		type === 'section'
			? {
					id: nextId('section'),
					type: 'section',
					name,
					direction: 'horizontal',
					itemSizing: 'auto', // 'auto' | 'fill'
					justify: 'left', // 'left' | 'center' | 'right' | 'around' | 'between' | 'evenly'
					align: 'end', // 'start' | 'center' | 'end' — cross-axis (vertical, when horizontal) alignment
					gap: 16,
					children: [],
					props: { ...visibilityProps },
					bindings: {},
					events: []
				}
			: type === 'grid'
				? (() => {
						const grid = defaultGrid();
						return {
							id: nextId('grid'),
							type: 'grid',
							name,
							...grid,
							children: new Array(grid.columns * grid.rows).fill(null),
							props: { ...visibilityProps, fillHeight: false },
							bindings: {},
							events: []
						};
					})()
				: {
						id: nextId(type),
						type,
						name,
						nameAuto: true,
						props: { ...visibilityProps, ...structuredClone(def.defaultProps) },
						bindings: {},
						events: []
					};

	if (container?.type === 'grid') {
		const cellIndex = target.index ?? container.children.findIndex((c) => !c);
		container.children[cellIndex] = el;
	} else {
		const toList = listFor(containerId);
		const index = Math.max(0, Math.min(target.index ?? toList.length, toList.length));
		toList.splice(index, 0, el);
	}
	uiState.selectedId = el.id;
	return el;
}

export function setLabels(ids) {
	doc.labels = [...ids];
}

// Wipes the page's content back to blank — components, variables, and the
// Workflow graph — but keeps imported labels, data sources, and page
// settings, since those are project setup, not layout the user built.
export function clearCanvas() {
	doc.elements = [];
	doc.elementsB = [];
	doc.variables = [];
	doc.workflow.connections = [];
	doc.workflow.transforms = [];
	doc.workflow.nodePositions = {};
	uiState.selectedId = null;
}

export function removeElement(id) {
	const { list, index, owner } = locateContainer(id);
	if (!list || index === -1) return;
	// A grid zone clears to null (preserving every other zone's position)
	// instead of splicing out, which would shift the rest along.
	if (owner?.type === 'grid') list[index] = null;
	else list.splice(index, 1);
	if (uiState.selectedId === id) uiState.selectedId = null;
}

// target: { containerId: null | 'colB' | sectionId, index }
// For a grid target, `index` addresses a specific zone directly. Dropping
// onto an empty zone just relocates the element there; dropping onto an
// occupied one swaps the two — the occupant takes whatever slot (a grid
// zone, or a plain list position) the dragged element is vacating.
export function moveElement(id, target = {}) {
	const { list: fromList, index: fromIndex, element, owner: fromOwner } = locateContainer(id);
	if (!element) return;
	let containerId = target.containerId ?? null;
	if (isContainerType(element.type) && !isRootContainerId(containerId)) containerId = null;
	const toContainer = findContainerById(containerId);

	if (toContainer?.type === 'grid') {
		const cellIndex = target.index ?? toContainer.children.findIndex((c) => !c);
		if (cellIndex < 0 || cellIndex >= toContainer.children.length) return;
		const occupant = toContainer.children[cellIndex];
		if (occupant?.id === id) return; // dropped back on itself

		if (fromOwner?.type === 'grid') fromList[fromIndex] = null;
		else fromList.splice(fromIndex, 1);

		if (occupant) {
			if (fromOwner?.type === 'grid') fromList[fromIndex] = occupant;
			else fromList.splice(Math.min(fromIndex, fromList.length), 0, occupant);
		}

		toContainer.children[cellIndex] = element;
		uiState.selectedId = id;
		return;
	}

	const toList = listFor(containerId);
	if (!toList) return;

	if (fromOwner?.type === 'grid') fromList[fromIndex] = null;
	else fromList.splice(fromIndex, 1);

	const sameList = toList === fromList;
	let idx = target.index ?? toList.length;
	if (sameList && fromOwner?.type !== 'grid' && fromIndex < idx) idx -= 1;
	idx = Math.max(0, Math.min(idx, toList.length));
	toList.splice(idx, 0, element);
	uiState.selectedId = id;
}
