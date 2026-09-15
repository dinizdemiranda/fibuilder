// Precise pixel width of a run of text, via an offscreen canvas — shared by
// every chip-based literal input (ExpressionField.svelte,
// GalleryFieldExpression.svelte) so a literal's box always matches its
// actual rendered width exactly, rather than the `Nch` approximation both
// used before: `ch` tracks a monospace "0"-glyph width, which for a
// proportional font overshoots real text width enough to read as a space
// that isn't actually in the data (see ExpressionField.svelte's history).
let canvas;
export function textPixelWidth(text, font = '13px system-ui, sans-serif') {
	if (!canvas) canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	ctx.font = font;
	return ctx.measureText(text).width;
}
