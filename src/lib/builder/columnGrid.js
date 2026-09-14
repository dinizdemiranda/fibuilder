// The Grid component's layout config — see types.js's 'grid' blockDef and
// GridProperties.svelte. Unlike Section, a grid's
// `children` is a fixed-size array of length columns*rows — index
// row*columns+col — holding either an element or null for an empty zone.
// That's what makes "one object per zone," specific-cell targeting, and
// swap-on-drop (see state.svelte.js's addElement/moveElement) possible: a
// zone's identity is its array index, not its position among siblings.

export const FR_OPTIONS = [0.25, 0.5, 0.75, 1, 2, 3, 4, 5];

export function defaultTrack() {
	return { mode: 'auto', fr: 1, px: 100 };
}

export function defaultGrid() {
	return {
		columns: 2,
		rows: 2,
		colTracks: [defaultTrack(), defaultTrack()],
		rowTracks: [defaultTrack(), defaultTrack()]
	};
}

// Grows/shrinks a track list to match a new column/row count, preserving
// whatever tracks already existed rather than resetting them all.
export function resizeTracks(tracks, count) {
	const n = Math.max(1, Math.min(12, Number(count) || 1));
	while (tracks.length < n) tracks.push(defaultTrack());
	while (tracks.length > n) tracks.pop();
	return n;
}

// Re-buckets an existing sparse children array onto a new columns*rows
// size, keeping whatever's already at (row,col) if that cell still exists —
// anything that falls outside the new bounds is dropped.
export function resizeGridChildren(element, newColumns, newRows) {
	const oldColumns = element.columns;
	const next = new Array(newColumns * newRows).fill(null);
	for (let i = 0; i < element.children.length; i++) {
		const child = element.children[i];
		if (!child) continue;
		const row = Math.floor(i / oldColumns);
		const col = i % oldColumns;
		if (row < newRows && col < newColumns) next[row * newColumns + col] = child;
	}
	element.children = next;
}

function trackCss(t) {
	if (t.mode === 'fixed') return `${Math.max(0, Number(t.px) || 0)}px`;
	if (t.mode === 'auto') return 'auto';
	return `${t.fr}fr`;
}

// The inline style for a grid element's flow container. `fillHeight` (from
// the element's own props, like Data Lookup/Label Preview) stretches it to
// fill the column and disables its own scrolling — "the grid cannot scroll,"
// its zones are fixed once laid out. height:100% (not flex:1) because the
// grid's own parent (CanvasBlock's .fi-block-content) is a plain block box,
// not a flex container, so a flex-basis property there is a no-op — a
// percentage height is what actually resolves against its (already
// flex-stretched) ancestor.
export function columnGridStyle(grid, fillHeight = false) {
	if (!grid) return '';
	const cols = grid.colTracks.map(trackCss).join(' ');
	const rows = grid.rowTracks.map(trackCss).join(' ');
	const heightPart = fillHeight ? 'height: 100%; overflow: hidden;' : '';
	return `display:grid; grid-template-columns:${cols}; grid-template-rows:${rows}; ${heightPart}`;
}
