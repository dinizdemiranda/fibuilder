<script>
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// App-wide tooltip: replaces the native title="" tooltip (which has an
	// ~1s hover delay) with one that shows instantly. Every hover target
	// sets data-tooltip="..." instead of title, and this is the only place
	// that renders it.
	//
	// This used to be a pure-CSS ::after pseudo-element, absolutely
	// positioned relative to its trigger — which meant any trigger sitting
	// inside a scrollable/overflow:hidden ancestor (the properties panel,
	// the canvas page, etc.) got its tooltip clipped or, worse, silently
	// widened that ancestor's scrollable bounds just by existing. That was
	// patched three separate times with per-container CSS overrides
	// (anchor to an edge here, flip downward there) — real fixes, but only
	// for the specific containers someone happened to notice. A fixed-
	// position tooltip computed from the trigger's actual viewport
	// geometry sidesteps the whole class of bug at once: it's never a
	// descendant of the hovered element, so no ancestor's overflow can
	// clip or measure it, and it clamps/flips itself to fit the viewport
	// wherever it's shown from.
	const GAP = 6;
	const EDGE = 8;

	onMount(() => {
		const el = document.createElement('div');
		el.className = 'fi-tooltip';
		el.style.display = 'none';
		document.body.appendChild(el);

		let current = null;

		function show(target, text) {
			current = target;
			el.textContent = text;
			el.style.visibility = 'hidden';
			el.style.display = 'block';
			const rect = target.getBoundingClientRect();
			const tt = el.getBoundingClientRect();
			let left = rect.left + rect.width / 2 - tt.width / 2;
			left = Math.max(EDGE, Math.min(left, window.innerWidth - tt.width - EDGE));
			let top = rect.top - tt.height - GAP;
			if (top < EDGE) top = rect.bottom + GAP;
			el.style.left = `${left}px`;
			el.style.top = `${top}px`;
			el.style.visibility = 'visible';
		}

		function hide() {
			current = null;
			el.style.display = 'none';
		}

		function onMouseOver(e) {
			const target = e.target.closest?.('[data-tooltip]');
			const text = target?.getAttribute('data-tooltip');
			if (target && text && target !== current) show(target, text);
		}

		function onMouseOut(e) {
			if (current && (e.target.closest?.('[data-tooltip]') === current) && !current.contains(e.relatedTarget)) {
				hide();
			}
		}

		window.addEventListener('mouseover', onMouseOver);
		window.addEventListener('mouseout', onMouseOut);
		// Non-bubbling, but capturing listeners on window still fire for a
		// scroll on any descendant — used to drop a stale-positioned
		// tooltip rather than track every scrollable ancestor.
		window.addEventListener('scroll', hide, true);

		return () => {
			window.removeEventListener('mouseover', onMouseOver);
			window.removeEventListener('mouseout', onMouseOut);
			window.removeEventListener('scroll', hide, true);
			el.remove();
		};
	});
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

	:global(.fi-tooltip) {
		position: fixed;
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
</style>
