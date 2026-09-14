<script>
	import { doc, uiState, resetPreviewOverrides } from './state.svelte.js';
	import { getLabelById } from './labels.js';
	import { selectedLabelId, labelFields, resolveFieldValue } from './workflow.js';
	import PreviewNode from './PreviewNode.svelte';
	import OrientationToggle from './OrientationToggle.svelte';
	import PageFooterBar from './PageFooterBar.svelte';
	import { cssVarsString } from './theme.js';
	import { columnRatioParts, columnGridTemplate, fitPreviewPageDimensions, PREVIEW_PAGE_MARGIN } from './layout.js';
	import { resolveProp } from './bindings.js';
	import './flow.css';

	// This component is created fresh every time Preview opens (+page.svelte
	// only mounts it while uiState.previewOpen is true), so this runs once per
	// session — button events from a previous run never leak into a new one.
	resetPreviewOverrides();

	let bodyW = $state(0);
	let bodyH = $state(0);

	// Independent from the canvas's own orientation toggle — starts matching
	// it (this component is remounted fresh each time Preview opens) but
	// switching it here must never write back to doc.page.
	// svelte-ignore state_referenced_locally -- seeds once per Preview open, by design
	let previewOrientation = $state(doc.page.orientation);

	// The payload mirrors what actually gets printed: which one label is
	// selected, plus that label's required fields as fed by the Workflow
	// wiring (through any transforms) — nothing else.
	let payloadJson = $derived.by(() => {
		const labelId = selectedLabelId();
		const label = labelId ? getLabelById(labelId) : null;
		const fields = {};
		if (labelId) {
			for (const field of labelFields(labelId)) {
				fields[field.name] = resolveFieldValue(labelId, field.name);
			}
		}
		return JSON.stringify({ label: label?.name ?? null, fields }, null, 2);
	});

	let ratio = $derived(columnRatioParts(doc.page.columnRatio));
	let dims = $derived(
		fitPreviewPageDimensions(previewOrientation, bodyW - PREVIEW_PAGE_MARGIN * 2, bodyH - PREVIEW_PAGE_MARGIN * 2)
	);
	let columnTemplate = $derived(
		columnGridTemplate(ratio, doc.page.showColumnDivider, doc.page.colAWidthMode, doc.page.colBWidthMode, dims.width)
	);
	let independentScroll = $derived(doc.page.columns === 2 && doc.page.scrollIndependently);
	function hasNoScrollFill(list) {
		return list.some((el) => (el.type === 'grid' || el.type === 'gallery') && el.props.fillHeight);
	}
	let colANoScroll = $derived(hasNoScrollFill(doc.elements));
	let colBNoScroll = $derived(hasNoScrollFill(doc.elementsB));

	let colAHidden = $derived(resolveProp(doc.page.colA, 'hidden') === 'true');
	let colADisabled = $derived(resolveProp(doc.page.colA, 'disabled') === 'true');
	let colBHidden = $derived(resolveProp(doc.page.colB, 'hidden') === 'true');
	let colBDisabled = $derived(resolveProp(doc.page.colB, 'disabled') === 'true');

	function close() {
		uiState.previewOpen = false;
	}

	function onKeydown(e) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="preview-overlay" onclick={close}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="preview-shell" onclick={(e) => e.stopPropagation()}>
		<div class="preview-topbar">
			<span class="preview-title">Preview · {doc.page.title}</span>
			<div class="preview-topbar-actions">
				<OrientationToggle value={previewOrientation} onchange={(v) => (previewOrientation = v)} />
				<button type="button" class="preview-close" onclick={close}>Close</button>
			</div>
		</div>
		<div class="preview-main">
			<div class="preview-body" bind:clientWidth={bodyW} bind:clientHeight={bodyH}>
				<div
					class="preview-page"
					style="background:{doc.page.background}; width:{dims.width}px; height:{dims.height}px; {cssVarsString(
						doc.page
					)}"
				>
					<div class="preview-page-scroll" class:independent-scroll={independentScroll}>
						{#if doc.page.columns === 2}
							<div class="fi-columns" style="grid-template-columns: {columnTemplate};">
								<div
									class="fi-flow fi-flow--vertical fi-flow-fill preview-col"
									class:independent-col={independentScroll && !colANoScroll}
									class:fi-inactive={colADisabled}
									style={doc.page.colA.props.background ? `background:${doc.page.colA.props.background};` : ''}
								>
									{#if !colAHidden}
										{#each doc.elements as el (el.id)}
											<PreviewNode element={el} />
										{/each}
									{/if}
								</div>
								{#if doc.page.showColumnDivider}
									<div class="preview-col-divider"></div>
								{/if}
								<div
									class="fi-flow fi-flow--vertical fi-flow-fill preview-col"
									class:independent-col={independentScroll && !colBNoScroll}
									class:fi-inactive={colBDisabled}
									style={doc.page.colB.props.background ? `background:${doc.page.colB.props.background};` : ''}
								>
									{#if !colBHidden}
										{#each doc.elementsB as el (el.id)}
											<PreviewNode element={el} />
										{/each}
									{/if}
								</div>
							</div>
						{:else}
							<div
								class="fi-flow fi-flow--vertical fi-flow-fill preview-col"
								class:fi-inactive={colADisabled}
								style={doc.page.colA.props.background ? `background:${doc.page.colA.props.background};` : ''}
							>
								{#if !colAHidden}
									{#each doc.elements as el (el.id)}
										<PreviewNode element={el} />
									{/each}
								{/if}
							</div>
						{/if}
					</div>
					<PageFooterBar />
				</div>
			</div>
			<div class="preview-json-panel">
				<span class="preview-json-title">Payload</span>
				<pre class="preview-json-content">{payloadJson}</pre>
			</div>
		</div>
	</div>
</div>

<style>
	.preview-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 32px;
	}
	.preview-shell {
		width: 90vw;
		height: 90vh;
		max-width: 90vw;
		max-height: 90vh;
		background: #fff;
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
	}
	.preview-topbar {
		height: 48px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		background: white;
		color: black;
		font-family: system-ui, sans-serif;
		font-size: 13px;
	}
	.preview-topbar-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.preview-close {
		background: transparent;
		border: none;
		border: 1px solid #87a3d1;
		font-family: inherit;
		font-size: 12px;
		padding: 6px 12px;
		border-radius: 6px;
		cursor: pointer;
	}
	.preview-close:hover {
		background: rgba(255, 255, 255, 0.22);
	}
	.preview-main {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 1fr minmax(260px, auto);
	}
	.preview-body {
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: gray;
	}
	.preview-json-panel {
		background: #000;
		border-left: 1px solid #1a1c1e;
		box-sizing: border-box;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow: hidden;
	}
	.preview-json-title {
		flex-shrink: 0;
		font-family: system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #8a8f98;
	}
	.preview-json-content {
		flex: 1;
		min-height: 0;
		overflow: auto;
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		line-height: 1.5;
		color: #a5f3fc;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.preview-page {
		/* Explicit width/height come from fitPreviewPageDimensions via inline
		   style — flex-shrink:0 makes sure .preview-body (a flex row) never
		   compresses that exact, ratio-locked size to squeeze it in; any
		   leftover room just becomes extra centered margin instead. */
		flex-shrink: 0;
		border-radius: 8px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
		outline-offset: -1px;
	}
	.preview-page-scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}
	.preview-col {
		padding: 24px;
		box-sizing: border-box;
	}
	/* Matches PreviewNode.svelte's own .fi-inactive (a separate scoped style
	   block, so duplicated here rather than shared) — a disabled column
	   dims and stops accepting input, same as a disabled component. */
	.preview-col.fi-inactive {
		opacity: 0.5;
		pointer-events: none;
	}
	.preview-page-scroll.independent-scroll {
		overflow: hidden;
	}
	.preview-page-scroll.independent-scroll .fi-columns {
		min-height: 0;
		height: 100%;
	}
	.fi-columns {
		display: grid;
		/* No gap — each column already has its own padding (.preview-col),
		   so a grid gap on top of that would double up the space between
		   them. */
		flex: 1;
		min-height: 100%;
	}
	.fi-columns .independent-col {
		overflow-y: auto;
		min-height: 0;
	}
	.preview-col-divider {
		background: var(--fi-outline, #c9cdd4);
	}
</style>
