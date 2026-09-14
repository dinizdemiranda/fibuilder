// Inline sizing for a block inside a flow container. Almost none of this is
// user-configurable — it just keeps flows looking sane in both directions —
// except a Button's own `fullWidth` prop, which opts it into the same
// width-filling behavior every other component already gets by default.
// `sizing` is section-level only ('auto' hugs content, 'fill' stretches every
// item edge-to-edge regardless of type); page-root flows always pass 'auto'.
export function blockWidthStyle(direction, type, sizing = 'auto', fullWidth = false) {
	if (sizing === 'fill') {
		return direction === 'horizontal' ? 'flex: 1 1 0;' : 'width: 100%;';
	}
	if (direction === 'horizontal') {
		if (type === 'button') return fullWidth ? 'flex: 1 1 0;' : 'flex: 0 0 auto;';
		if (type === 'text') return 'flex: 0 0 auto;';
		return 'flex: 1 1 220px; max-width: 360px;';
	}
	if (type === 'button' && !fullWidth) return 'align-self: flex-start;';
	return 'width: 100%;';
}

// Opt-in per-element growth, for the rare block (e.g. Label Preview, Data
// Lookup) that wants to consume whatever vertical space is available rather
// than sizing to its own content.
//
// In a vertical column, that's the remaining space down the column
// (flex-grow along the main axis) — flex-basis:auto (not 0) matters here:
// with basis:0 + min-height:0, a flex item has nothing forcing it to its
// content's actual minimum size, so with other non-fill siblings in the
// column it can be resolved shorter than its content needs. The content
// (e.g. a Data Lookup's table rows) doesn't get clipped when that happens —
// it just visually overflows the item's box straight into the next
// sibling, since flex layout positions siblings by each item's *resolved*
// box, not its rendered content extent. basis:auto restores flexbox's
// normal automatic-minimum-size behavior (never smaller than content needs)
// while flex-grow:1 still stretches it into any real leftover space.
//
// In a horizontal row, there's no "main axis leftover" concept for height —
// instead it means matching the row's own height (set by its tallest
// sibling), so align-self: stretch instead. That distinction actually
// matters, and not just cosmetically: the row's default
// align-items: flex-start means a non-stretched item's height stays
// content-driven/auto, which CSS never treats as a "definite" size — so a
// height:100% descendant chain (e.g. Label Preview's own LabelCanvas) would
// silently resolve to 0 instead of filling the row.
// Gallery/Grid are a different case from Data Lookup/Label Preview: those
// don't clip their own content, so they *need* the content-based floor
// above to avoid an ugly collapse. Gallery/Grid do clip (overflow:hidden,
// paginating/laying out whatever fits) — for them, that same content-based
// floor is exactly the bug: it stops .fi-flow-fill (their ancestor column's
// own flex item, shrink:0 by design — see flow.css) from ever resolving
// smaller than their *unpaginated* natural size, so the whole chain inflates
// to fit content nothing ever actually shows. flex-basis:0 gives them no
// forced minimum at all, so the ancestor chain is free to shrink to
// whatever's genuinely available and let them clip the rest themselves.
const SELF_CLIPPING_FILL_TYPES = new Set(['gallery', 'grid']);

export function fillHeightStyle(element, direction) {
	if (!element?.props?.fillHeight) return '';
	if (direction === 'vertical') {
		return SELF_CLIPPING_FILL_TYPES.has(element.type) ? 'flex: 1 1 0; min-height: 0;' : 'flex: 1 1 auto;';
	}
	return 'align-self: stretch;';
}

export function columnRatioParts(ratio) {
	const [a, b] = (ratio ?? '50/50').split('/').map(Number);
	return [a || 50, b || 50];
}

// The two-column grid's track list. 'fill' columns take their proportional
// share of the ratio (the drag-handle's 6ths — see Canvas.svelte); 'auto'
// columns instead shrink to their own content's width (grid's max-content
// keyword), floored at 1/6 of the page so an empty/near-empty auto column
// never collapses to nothing. Used by both the design canvas and Preview,
// each passing its own actual page width for the floor.
export function columnGridTemplate(ratio, showDivider, colAWidthMode, colBWidthMode, pageWidth) {
	const floor = Math.max(0, Math.round(pageWidth / 6));
	const track = (mode, fr) => (mode === 'auto' ? `minmax(${floor}px, max-content)` : `${fr}fr`);
	const a = track(colAWidthMode, ratio[0]);
	const b = track(colBWidthMode, ratio[1]);
	return showDivider ? `${a} 1px ${b}` : `${a} ${b}`;
}

// The design canvas's page size is a fixed pixel size the user picks from a
// short list of presets — never fit-to-container. A dynamically-sized page
// meant every measurement-dependent descendant (Gallery's row/column math,
// notably) was measuring a page that could itself still be settling into its
// final size, which was a real source of layout bugs. A predefined size
// removes that whole class of problem: what you measure is what you get,
// every time, and the canvas just scrolls if the page doesn't fit the
// viewport.
export const PAGE_SIZE_PRESETS = [
	{ id: '1280x800', label: '1280 × 800', w: 1280, h: 800 },
	{ id: '1280x720', label: '1280 × 720', w: 1280, h: 720 },
	{ id: '768x1024', label: '768 × 1024', w: 768, h: 1024 }
];

// Normalizes a preset's two dimensions onto the current orientation — the
// longer of the two goes on the width axis for landscape, the height axis
// for portrait — regardless of which axis the preset itself was defined
// with (768×1024 is written portrait-first, the other two landscape-first).
export function resolvePageSize(pageSizeId, orientation) {
	const preset = PAGE_SIZE_PRESETS.find((p) => p.id === pageSizeId) ?? PAGE_SIZE_PRESETS[0];
	const long = Math.max(preset.w, preset.h);
	const short = Math.min(preset.w, preset.h);
	return orientation === 'landscape' ? { width: long, height: short } : { width: short, height: long };
}
// Breathing room kept between .preview-page and the edges of .preview-body,
// on all four sides.
export const PREVIEW_PAGE_MARGIN = 16;

// Preview's page frame has its own fixed ideal size (unlike the canvas,
// which just grows/shrinks to fill whatever room it has) — 1280x800
// landscape / 800x1280 portrait, shrinking only as far as half that
// (640x400 / 400x640) before it'd rather stay legible than keep fitting the
// container. Both bounds keep the 16:10 ratio, so a single uniform scale
// factor (clamped to [0.5, 1]) is all either dimension needs.
const PREVIEW_MAX_LONG = 1280;
const PREVIEW_MAX_SHORT = 800;

export function fitPreviewPageDimensions(orientation, availableWidth, availableHeight) {
	const maxW = orientation === 'landscape' ? PREVIEW_MAX_LONG : PREVIEW_MAX_SHORT;
	const maxH = orientation === 'landscape' ? PREVIEW_MAX_SHORT : PREVIEW_MAX_LONG;
	const w = Math.max(0, availableWidth);
	const h = Math.max(0, availableHeight);
	const scale = Math.max(Math.min(w / maxW, h / maxH, 1), 0.5);
	return {
		width: Math.round(maxW * scale),
		height: Math.round(maxH * scale)
	};
}

// Largest size at the item's own aspect ratio that fits inside the available
// box on both axes — the general form of the fit above, used for label
// reconstructions (whose ratio comes from the label's own mm dimensions
// rather than a fixed 16:10/10:16 device ratio).
export function containFit(itemWidth, itemHeight, availableWidth, availableHeight) {
	const w = Math.max(0, availableWidth);
	const h = Math.max(0, availableHeight);
	if (itemWidth <= 0 || itemHeight <= 0 || w <= 0 || h <= 0) return { width: 0, height: 0 };
	const scale = Math.min(w / itemWidth, h / itemHeight);
	return { width: itemWidth * scale, height: itemHeight * scale };
}
