// Position a dropdown-style menu with `position: fixed`, computed from its
// anchor's real viewport geometry, instead of `position: absolute` relative
// to a CSS-positioned ancestor. An absolute menu gets silently clipped (or
// worse, expands) the moment any ancestor between it and its positioned
// parent sets overflow:hidden/auto/scroll — exactly what happened once
// ExpressionField's picker started appearing inside popovers with a
// scrolling body (BindingPopover, VariablePopover, etc). Fixed positioning
// sidesteps the whole class of bug: nothing between the menu and the
// viewport can clip or measure it.
//
// Returns a `style` attribute value string — bind it directly:
// `<div class="ef-menu" style={positionBelow(anchorEl, {width: 190})}>`.
export function positionBelow(anchorEl, { width = 190, maxHeight = 220, gap = 4, edge = 8 } = {}) {
	if (!anchorEl) return '';
	const rect = anchorEl.getBoundingClientRect();
	const left = Math.max(edge, Math.min(rect.left, window.innerWidth - width - edge));
	const spaceBelow = window.innerHeight - rect.bottom;
	const openUp = spaceBelow < Math.min(maxHeight, rect.top);
	return openUp
		? `position: fixed; left: ${left}px; bottom: ${window.innerHeight - rect.top + gap}px;`
		: `position: fixed; left: ${left}px; top: ${rect.bottom + gap}px;`;
}
