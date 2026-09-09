// Inline sizing for a block inside a flow container. No per-element style is
// user-configurable — this just keeps flows looking sane in both directions.
// `sizing` is section-level only ('auto' hugs content, 'fill' stretches every
// item edge-to-edge regardless of type); page-root flows always pass 'auto'.
export function blockWidthStyle(direction, type, sizing = 'auto') {
	if (sizing === 'fill') {
		return direction === 'horizontal' ? 'flex: 1 1 0;' : 'width: 100%;';
	}
	if (direction === 'horizontal') {
		if (type === 'button' || type === 'text') return 'flex: 0 0 auto;';
		return 'flex: 1 1 220px; max-width: 360px;';
	}
	if (type === 'button') return 'align-self: flex-start;';
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
export function fillHeightStyle(element, direction) {
	if (!element?.props?.fillHeight) return '';
	if (direction === 'vertical') return 'flex: 1 1 auto;';
	return 'align-self: stretch;';
}

export function columnRatioParts(ratio) {
	const [a, b] = (ratio ?? '50/50').split('/').map(Number);
	return [a || 50, b || 50];
}

// The page is a fixed-ratio frame — 16:10 in landscape, 10:16 in portrait
// (the same physical size, just rotated) — that always fits its container
// without ever needing that container to scroll. Given the space actually
// available (already net of padding), this returns the largest frame at
// that ratio that fits inside it on both axes.
const ASPECT_LONG = 16;
const ASPECT_SHORT = 10;

export function fitPageDimensions(orientation, availableWidth, availableHeight) {
	const aspectW = orientation === 'landscape' ? ASPECT_LONG : ASPECT_SHORT;
	const aspectH = orientation === 'landscape' ? ASPECT_SHORT : ASPECT_LONG;
	const w = Math.max(0, availableWidth);
	const h = Math.max(0, availableHeight);
	const scale = Math.min(w / aspectW, h / aspectH);
	return {
		width: Math.max(0, Math.floor(aspectW * scale)),
		height: Math.max(0, Math.floor(aspectH * scale))
	};
}

// Same fit, but never shrinks past minSize on either axis — once the
// container's too small to fit a page that size, the page just overflows it
// (its container scrolls) instead of continuing to shrink into illegibility.
// The fixed aspect ratio means clamping the smaller axis to minSize is
// enough to guarantee the other axis clears it too.
export function fitPageDimensionsWithMin(orientation, availableWidth, availableHeight, minSize = 540) {
	const dims = fitPageDimensions(orientation, availableWidth, availableHeight);
	if (dims.width >= minSize && dims.height >= minSize) return dims;
	const aspectW = orientation === 'landscape' ? ASPECT_LONG : ASPECT_SHORT;
	const aspectH = orientation === 'landscape' ? ASPECT_SHORT : ASPECT_LONG;
	const scale = minSize / Math.min(aspectW, aspectH);
	return {
		width: Math.floor(aspectW * scale),
		height: Math.floor(aspectH * scale)
	};
}

export const CANVAS_PADDING = 40;
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
