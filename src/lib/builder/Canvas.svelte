<script>
	import { doc, uiState, selectElement, removeElement } from './state.svelte.js';
	import FlowZone from './FlowZone.svelte';
	import OrientationToggle from './OrientationToggle.svelte';
	import PageFooterBar from './PageFooterBar.svelte';
	import { cssVarsString } from './theme.js';
	import { columnRatioParts, fitPageDimensionsWithMin, CANVAS_PADDING } from './layout.js';

	let canvasW = $state(0);
	let canvasH = $state(0);

	let ratio = $derived(columnRatioParts(doc.page.columnRatio));
	let dims = $derived(
		fitPageDimensionsWithMin(doc.page.orientation, canvasW - CANVAS_PADDING * 2, canvasH - CANVAS_PADDING * 2)
	);
	let columnTemplate = $derived(
		doc.page.showColumnDivider ? `${ratio[0]}fr 1px ${ratio[1]}fr` : `${ratio[0]}fr ${ratio[1]}fr`
	);

	function onKeydown(e) {
		if (!uiState.selectedId) return;
		const tag = document.activeElement?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		if (e.key === 'Delete' || e.key === 'Backspace') {
			removeElement(uiState.selectedId);
		}
	}

	// Centralized so every selection path (clicking in the canvas, clicking
	// an Objects-list row, etc.) gets the same behavior — 'nearest' only
	// scrolls the minimum needed to bring a partially-obscured selection
	// fully into view, and does nothing at all when it's already visible.
	$effect(() => {
		const id = uiState.selectedId;
		if (!id) return;
		document.querySelector(`[data-element-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	});
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="canvas-scroll" bind:clientWidth={canvasW} bind:clientHeight={canvasH} onclick={() => selectElement(null)}>
	<div class="canvas-toolbar">
		<OrientationToggle value={doc.page.orientation} onchange={(v) => (doc.page.orientation = v)} />
	</div>
	<div
		class="fi-page"
		style="background:{doc.page.background}; width:{dims.width}px; height:{dims.height}px; {cssVarsString(
			doc.page
		)}"
	>
		<div class="fi-page-scroll">
			{#if doc.page.columns === 2}
				<div class="fi-columns" style="grid-template-columns: {columnTemplate};">
					<div class="fi-column">
						<FlowZone
							list={doc.elements}
							containerId={null}
							direction="vertical"
							allowSections={true}
							emptyLabel="Drag components here"
							fill={true}
						/>
					</div>
					{#if doc.page.showColumnDivider}
						<div class="fi-col-divider"></div>
					{/if}
					<div class="fi-column">
						<FlowZone
							list={doc.elementsB}
							containerId="colB"
							direction="vertical"
							allowSections={true}
							emptyLabel="Drag components here"
							fill={true}
						/>
					</div>
				</div>
			{:else}
				<FlowZone
					list={doc.elements}
					containerId={null}
					direction="vertical"
					allowSections={true}
					emptyLabel="Drag components here to get started"
					fill={true}
				/>
			{/if}
		</div>
		<PageFooterBar />
	</div>
</div>

<style>
	.canvas-scroll {
		flex: 1;
		min-width: 0;
		overflow: auto;
		background:
			radial-gradient(circle, #c7cbd1 1px, transparent 1px) 0 0 / 20px 20px,
			#e7e8eb;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}
	.canvas-toolbar {
		position: absolute;
		right: 16px;
		top: 8px;
	}
	.fi-page {
		flex-shrink: 0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.fi-page-scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 24px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}
	.fi-columns {
		display: grid;
		gap: 20px;
		flex: 1;
		min-height: 100%;
	}
	.fi-column {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.fi-col-divider {
		background: var(--fi-outline, #c9cdd4);
	}
</style>
