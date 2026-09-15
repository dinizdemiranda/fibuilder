// Pure, state-independent formula helpers — turning a chip's display name
// into a safe JS identifier, running a formula's code as a small sandboxed
// expression, and coercing whatever it returns into something valid for the
// field/variable type it's feeding. Nothing here touches `doc` or reads a
// component's value; see bindings.js (evaluating a formula against live
// values) and variables.js (cycle detection across variables) for that.
//
// A formula is always a single JS *expression*, not a script — enforced by
// the editor itself (FormulaPopover.svelte's code field is a plain <input>,
// which structurally can't hold a newline) rather than by anything here.

function toIdentifierBase(name) {
	const words = (name || 'value')
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (words.length === 0) return 'value';
	const camel = words
		.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)))
		.join('');
	return /^[a-zA-Z_$]/.test(camel) ? camel : `v${camel}`;
}

// Unique among `existing` (the other identifiers already used by this same
// formula) — appends a number rather than colliding with a different
// reference that happens to produce the same base name (e.g. two sources
// both named "Total").
export function sanitizeIdentifier(name, existing = []) {
	const base = toIdentifierBase(name);
	if (!existing.includes(base)) return base;
	let n = 2;
	while (existing.includes(`${base}${n}`)) n += 1;
	return `${base}${n}`;
}

// Runs `code` as the body of `return (<code>);`, with `refNames` bound as
// parameters set to `refValues` — a Function constructor, not eval(): it
// can't see or capture this module's own local variables, only the globals
// any script on the page already has access to. That's the right amount of
// sandboxing for a single builder user writing formulas for their own
// page, not a boundary against a hostile third party.
export function runFormulaCode(code, refNames, refValues) {
	const trimmed = (code ?? '').trim();
	if (!trimmed) return { ok: true, value: '' };
	try {
		// eslint-disable-next-line no-new-func
		const fn = new Function(...refNames, `return (${trimmed});`);
		return { ok: true, value: fn(...refValues) };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
}

// Coerces a raw JS result into whatever a field of `type` actually stores —
// this document keeps booleans as the strings 'true'/'false' and dates as
// 'YYYY-MM-DD', matching every other prop in it (see bindings.js). Returns
// {ok:false} rather than a best-effort guess when the result genuinely
// doesn't fit the type — e.g. a number field getting back NaN, or a date
// field getting back a string Date can't parse — so the caller can surface
// that as a real validation error instead of silently storing garbage.
export function coerceFormulaResult(type, raw) {
	if (type === 'number') {
		if (raw === '' || raw === null || raw === undefined) return { ok: true, value: '' };
		const n = Number(raw);
		return Number.isFinite(n) ? { ok: true, value: String(n) } : { ok: false };
	}
	if (type === 'boolean') {
		if (typeof raw === 'boolean') return { ok: true, value: raw ? 'true' : 'false' };
		if (raw === 'true' || raw === 'false') return { ok: true, value: raw };
		return { ok: false };
	}
	if (type === 'date') {
		if (raw === '' || raw === null || raw === undefined) return { ok: true, value: '' };
		const d = new Date(raw);
		return Number.isNaN(d.getTime()) ? { ok: false } : { ok: true, value: d.toISOString().slice(0, 10) };
	}
	// text (and string, the variable-type spelling of the same thing) accepts
	// whatever, stringified.
	if (raw === null || raw === undefined) return { ok: true, value: '' };
	return { ok: true, value: String(raw) };
}
