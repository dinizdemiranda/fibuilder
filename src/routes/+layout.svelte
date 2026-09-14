<script>
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		font-family: system-ui, sans-serif;
	}

	/* App-wide tooltip: replaces the native title="" tooltip (which has an
	   ~1s hover delay) with one that shows instantly. Every hover target
	   sets data-tooltip="..." instead of title, and this is the only place
	   that renders it. */
	:global([data-tooltip]) {
		position: relative;
	}
	/* display:none (not opacity/visibility) so the hidden tooltip text never
	   participates in layout at all — a visibility:hidden pseudo-element
	   still occupies box space, which was widening scrollable ancestors
	   (e.g. the properties panel) off-screen and causing a phantom
	   horizontal scrollbar the moment a wide tooltip existed anywhere in
	   them, even unhovered. */
	:global([data-tooltip]::after) {
		content: attr(data-tooltip);
		display: none;
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		background: #1a1c1e;
		color: #fff;
		font-family: system-ui, sans-serif;
		font-size: 11px;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		padding: 4px 8px;
		border-radius: 5px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		pointer-events: none;
		z-index: 10000;
	}
	:global([data-tooltip]:hover::after) {
		display: block;
	}
	/* The properties panel is flush against the window's right edge, and its
	   header's Delete button sits right at that edge too — a centered
	   tooltip there would render half off-screen, forcing a horizontal
	   scrollbar into existence just from hovering. Anchor to the button's
	   own right edge instead of centering under it. */
	:global(.properties-header [data-tooltip]::after) {
		left: auto;
		right: 0;
		transform: none;
	}
	/* Anything hovered near the very top of the viewport (the topbar itself,
	   or the canvas's own toolbar sitting just below it) has no room above it
	   for the default upward tooltip — it renders clipped/invisible against
	   the top edge. Flip those down instead. */
	:global(.topbar [data-tooltip]::after),
	:global(.canvas-toolbar [data-tooltip]::after) {
		bottom: auto;
		top: calc(100% + 6px);
	}
	/* The add/remove-column buttons sit right at a page edge (left, right,
	   or top — see Canvas.svelte). .fi-page clips its own overflow, but
	   .fi-page-scroll (a nested overflow:auto ancestor) still measures its
	   own scrollable content bounds from a centered tooltip's box even
	   though it'd end up visually clipped by .fi-page anyway — that
	   phantom extra scroll range was what actually created the "weird"
	   scrollbar/jump the moment one of these was hovered. Anchoring (or, for
	   the delete button, also flipping down) keeps the tooltip's box inside
	   the page's own bounds so it never contributes any of that. */
	:global(.col-add-btn--left[data-tooltip]::after) {
		left: 0;
		transform: none;
	}
	:global(.col-add-btn--right[data-tooltip]::after),
	:global(.col-delete-btn[data-tooltip]::after) {
		left: auto;
		right: 0;
		transform: none;
	}
	:global(.col-delete-btn[data-tooltip]::after) {
		bottom: auto;
		top: calc(100% + 6px);
	}
</style>
