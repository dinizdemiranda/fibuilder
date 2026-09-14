<script>
	import { untrack } from 'svelte';
	import { doc, uiState, selectElement, removeElement, addColumn, removeColumn } from './state.svelte.js';
	import FlowZone from './FlowZone.svelte';
	import ZoomControls from './ZoomControls.svelte';
	import PageFooterBar from './PageFooterBar.svelte';
	import Icon from './Icon.svelte';
	import { cssVarsString } from './theme.js';
	import { resolveProp } from './bindings.js';
	import { columnRatioParts, columnGridTemplate, resolvePageSize } from './layout.js';

	// Must match .canvas-scroll's own padding below — the breathing room
	// zoom-to-fit leaves around the page rather than fitting it edge-to-edge.
	const CANVAS_PADDING = 40;
	const ZOOM_MIN = 0.5;
	const ZOOM_MAX = 1;
	const ZOOM_STEP = 0.1;

	let canvasW = $state(0);
	let canvasH = $state(0);
	let zoom = $state(1);

	let ratio = $derived(columnRatioParts(doc.page.columnRatio));
	let dims = $derived(resolvePageSize(doc.page.pageSize, doc.page.orientation));

	// The scale that fits the whole (unscaled) page inside the visible
	// canvas area — recomputed whenever the page size/orientation or the
	// panel itself resizes. Falls back to 1 before the panel has been
	// measured at least once.
	let fitZoom = $derived.by(() => {
		const availW = canvasW - CANVAS_PADDING * 2;
		const availH = canvasH - CANVAS_PADDING * 2;
		if (availW <= 0 || availH <= 0 || dims.width <= 0 || dims.height <= 0) return 1;
		return Math.min(availW / dims.width, availH / dims.height);
	});

	function clampZoom(z) {
		return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
	}
	// A manual zoom in/out step — zoom always starts on a 10% increment, so
	// this just keeps it there as it moves.
	function roundZoom(z) {
		return clampZoom(Math.round(z * 10) / 10);
	}
	// Floors (never rounds up) to the nearest 10% step at or below the
	// actual fit ratio, so "zoom to fit" and the auto-clamp below never
	// land on a size that's still too big to show the whole page — at the
	// cost of not *quite* filling the canvas some of the time, in exchange
	// for zoom always landing on a clean 10% increment.
	function fitZoomStep(fit) {
		return clampZoom(Math.floor(fit * 10) / 10);
	}

	function zoomIn() {
		zoom = roundZoom(zoom + ZOOM_STEP);
	}
	function zoomOut() {
		zoom = roundZoom(zoom - ZOOM_STEP);
	}
	function zoomToFit() {
		zoom = fitZoomStep(fitZoom);
	}

	// Whenever a bigger page size gets picked, or the panel itself gets
	// smaller, and the page no longer fits at the current zoom — zoom out
	// just enough to show the whole thing again (down to ZOOM_MIN, past
	// which the canvas just scrolls). Never zooms in on its own; that's
	// what the explicit "zoom to fit" button is for.
	//
	// zoom is read via untrack so this effect's dependency is the size
	// inputs alone — reading it normally would also re-run the effect on
	// every zoom change the buttons themselves make, which would
	// immediately clamp any manual zoom-in straight back down to fitZoom,
	// making the zoom-in button a no-op whenever the page doesn't already
	// fit at 100%.
	//
	// Depends on dims/canvasW/canvasH directly rather than just on
	// fitZoom's resulting number — two different page sizes can land on
	// the exact same fit ratio (e.g. switching only the height of a
	// width-constrained page), and a $derived's value-equality check skips
	// notifying dependents when the recomputed number is unchanged, which
	// would silently skip the clamp check on that switch.
	$effect(() => {
		dims.width;
		dims.height;
		canvasW;
		canvasH;
		const target = fitZoomStep(fitZoom);
		const current = untrack(() => zoom);
		if (current > target) zoom = target;
	});

	let columnTemplate = $derived(
		columnGridTemplate(ratio, doc.page.showColumnDivider, doc.page.colAWidthMode, doc.page.colBWidthMode, dims.width)
	);
	// The drag-handle proportion only means something when both columns are
	// sharing the row proportionally — an 'auto' column sizes to its own
	// content instead, so dragging a ratio between it and its sibling
	// wouldn't do anything meaningful.
	let bothFill = $derived(doc.page.colAWidthMode === 'fill' && doc.page.colBWidthMode === 'fill');
	let independentScroll = $derived(doc.page.columns === 2 && doc.page.scrollIndependently);
	// A fill-height Grid or Gallery stretches to its column and can't scroll
	// itself (the Gallery paginates instead), so that column has nothing to
	// gain from independent scrolling either — only the *other* column (if
	// any) actually needs its own scrollbar.
	function hasNoScrollFill(list) {
		return list.some((el) => (el.type === 'grid' || el.type === 'gallery') && el.props.fillHeight);
	}
	let colANoScroll = $derived(hasNoScrollFill(doc.elements));
	let colBNoScroll = $derived(hasNoScrollFill(doc.elementsB));

	// Column-level hidden/disabled — resolveProp so a condition set via the
	// column's own VisibilityFields (ColumnProperties.svelte) is live here
	// too, same as any component's. Design keeps rendering a hidden/disabled
	// column (just dimmed) so it's still reachable to edit; Preview
	// (PreviewModal.svelte) is what actually skips/deactivates it.
	let colAHidden = $derived(resolveProp(doc.page.colA, 'hidden') === 'true');
	let colADisabled = $derived(resolveProp(doc.page.colA, 'disabled') === 'true');
	let colBHidden = $derived(resolveProp(doc.page.colB, 'hidden') === 'true');
	let colBDisabled = $derived(resolveProp(doc.page.colB, 'disabled') === 'true');

	// Column hover/select — mirrors CanvasBlock's own mouseover/mouseout
	// pattern (stopPropagation so a nested block's own hover claim wins
	// over its parent column's) so a column behaves like any other
	// selectable/hoverable object, just with its own reserved id instead of
	// a real element ('col-a' | 'col-b' — see isColumnId in state.svelte.js).
	function colId(side) {
		return side === 'a' ? 'col-a' : 'col-b';
	}
	function onColMouseOver(e, side) {
		e.stopPropagation();
		uiState.hoveredId = colId(side);
	}
	function onColMouseOut(e, side) {
		// mouseout fires when the pointer moves onto *any* descendant, not
		// just when it truly leaves the column — without this check, moving
		// onto the add-column button (a child of .fi-column) cleared
		// hoveredId immediately, which hid the button the instant the
		// pointer reached it (it's only ever shown while hovered/selected),
		// making it effectively unclickable unless the column was already
		// selected.
		if (e.currentTarget.contains(e.relatedTarget)) return;
		if (uiState.hoveredId === colId(side)) uiState.hoveredId = null;
	}
	function onColFocus(e, side) {
		e.stopPropagation();
		uiState.hoveredId = colId(side);
	}
	function onColBlur(e, side) {
		if (e.currentTarget.contains(e.relatedTarget)) return;
		if (uiState.hoveredId === colId(side)) uiState.hoveredId = null;
	}
	function onColClick(e, side) {
		e.stopPropagation();
		selectElement(colId(side));
	}

	// The column-proportion drag handle: tracks the live pointer position
	// as a fraction of the two-column area's width while dragging, snapping
	// only on release — see onResizeEnd. Shown while either column is
	// *selected* (not merely hovered) — mouseenter/mouseleave on .fi-columns
	// fires for the whole area regardless of which descendant the pointer is
	// actually over, so a hover-based reveal couldn't tell "hovering the
	// column itself" apart from "hovering some component inside it";
	// selection already makes exactly that distinction (a nested block's own
	// click claims it via stopPropagation before it ever reaches the
	// column's onclick).
	let colSelected = $derived(uiState.selectedId === 'col-a' || uiState.selectedId === 'col-b');
	let colsAreaEl = $state(null);
	// .fi-page-scroll's own (unscaled) visible height, plus its live scroll
	// offset — together these give the handle's target position, the
	// *visible* viewport's own vertical center, in the same coordinate
	// space .fi-columns's absolute positioning uses. Computed in JS rather
	// than via position:sticky: sticky's clamping range is bounded by its
	// own containing block (.fi-columns's row), which isn't guaranteed to
	// span the column's full (possibly overflowing) content height — this
	// way the handle stays centered in the viewport across the *entire*
	// scroll range regardless of how tall that row ends up being.
	let pageScrollH = $state(0);
	let pageScrollTop = $state(0);
	let handleTop = $derived(pageScrollTop + pageScrollH / 2);
	let dragging = $state(false);
	let dragFraction = $state(0.5);

	function startResize(e) {
		e.preventDefault();
		e.stopPropagation();
		dragFraction = ratio[0] / (ratio[0] + ratio[1]);
		dragging = true;
	}

	$effect(() => {
		if (!dragging) return;
		function onMove(e) {
			if (!colsAreaEl) return;
			const rect = colsAreaEl.getBoundingClientRect();
			if (rect.width <= 0) return;
			const f = (e.clientX - rect.left) / rect.width;
			// Keep at least 1 of the 12 units on each side.
			dragFraction = Math.max(1 / 12, Math.min(11 / 12, f));
		}
		function onUp() {
			const a = Math.max(1, Math.min(11, Math.round(dragFraction * 12)));
			doc.page.columnRatio = `${a}/${12 - a}`;
			dragging = false;
		}
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
	});

	function onKeydown(e) {
		if (!uiState.selectedId) return;
		const tag = document.activeElement?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (uiState.selectedId === 'col-a') removeColumn('a');
			else if (uiState.selectedId === 'col-b') removeColumn('b');
			else removeElement(uiState.selectedId);
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
<div
	class="canvas-scroll"
	bind:clientWidth={canvasW}
	bind:clientHeight={canvasH}
	onclick={() => selectElement(null)}
>
	<div class="canvas-zoom-bar">
		<ZoomControls {zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomToFit={zoomToFit} />
	</div>
	<div class="fi-page-zoom-wrap" style="width:{dims.width * zoom}px; height:{dims.height * zoom}px;">
		<div
			class="fi-page"
			style="background:{doc.page.background}; width:{dims.width}px; height:{dims.height}px; transform: scale({zoom}); {cssVarsString(
				doc.page
			)}"
		>
			<div
				class="fi-page-scroll"
				class:independent-scroll={independentScroll}
				bind:clientHeight={pageScrollH}
				onscroll={(e) => (pageScrollTop = e.currentTarget.scrollTop)}
			>
				{#if doc.page.columns === 2}
					<div
						class="fi-columns"
						style="grid-template-columns: {columnTemplate};"
						bind:this={colsAreaEl}
					>
						<div
							class="fi-column"
							class:has-fill={colANoScroll}
							class:independent-col={independentScroll && !colANoScroll}
							class:col-hovered={uiState.hoveredId === 'col-a'}
							class:col-selected={uiState.selectedId === 'col-a'}
							class:col-hidden={colAHidden}
							class:col-disabled={colADisabled}
							style={doc.page.colA.props.background ? `background:${doc.page.colA.props.background};` : ''}
							onmouseover={(e) => onColMouseOver(e, 'a')}
							onmouseout={(e) => onColMouseOut(e, 'a')}
							onfocus={(e) => onColFocus(e, 'a')}
							onblur={(e) => onColBlur(e, 'a')}
							onclick={(e) => onColClick(e, 'a')}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && selectElement('col-a')}
						>
							{#if uiState.selectedId === 'col-a'}
								<div class="col-delete-wrap">
									<button
										type="button"
										class="col-delete-btn"
										data-tooltip="Remove column"
										onclick={(e) => {
											e.stopPropagation();
											removeColumn('a');
										}}
									>
										<Icon name="trash" size={13} />
									</button>
								</div>
							{/if}
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
						<div
							class="fi-column"
							class:has-fill={colBNoScroll}
							class:independent-col={independentScroll && !colBNoScroll}
							class:col-hovered={uiState.hoveredId === 'col-b'}
							class:col-selected={uiState.selectedId === 'col-b'}
							class:col-hidden={colBHidden}
							class:col-disabled={colBDisabled}
							style={doc.page.colB.props.background ? `background:${doc.page.colB.props.background};` : ''}
							onmouseover={(e) => onColMouseOver(e, 'b')}
							onmouseout={(e) => onColMouseOut(e, 'b')}
							onfocus={(e) => onColFocus(e, 'b')}
							onblur={(e) => onColBlur(e, 'b')}
							onclick={(e) => onColClick(e, 'b')}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && selectElement('col-b')}
						>
							{#if uiState.selectedId === 'col-b'}
								<div class="col-delete-wrap">
									<button
										type="button"
										class="col-delete-btn"
										data-tooltip="Remove column"
										onclick={(e) => {
											e.stopPropagation();
											removeColumn('b');
										}}
									>
										<Icon name="trash" size={13} />
									</button>
								</div>
							{/if}
							<FlowZone
								list={doc.elementsB}
								containerId="colB"
								direction="vertical"
								allowSections={true}
								emptyLabel="Drag components here"
								fill={true}
							/>
						</div>

						{#if bothFill && dragging}
							<div class="col-grid-overlay">
								{#each Array(11) as _, i (i)}
									<div
										class="col-grid-line"
										style="left: {((i + 1) / 12) * 100}%;"
										class:active={i + 1 === Math.round(dragFraction * 12)}
									></div>
								{/each}
							</div>
						{/if}
						{#if bothFill && (colSelected || dragging)}
							<button
								type="button"
								class="col-resize-handle"
								style="left: {(dragging ? dragFraction : ratio[0] / (ratio[0] + ratio[1])) * 100}%; top: {handleTop}px;"
								onpointerdown={startResize}
								onclick={(e) => e.stopPropagation()}
								aria-label="Resize columns"
							></button>
						{/if}
					</div>
				{:else}
					<div
						class="fi-column"
						class:has-fill={colANoScroll}
						class:col-hovered={uiState.hoveredId === 'col-a'}
						class:col-selected={uiState.selectedId === 'col-a'}
						class:col-hidden={colAHidden}
						class:col-disabled={colADisabled}
						style={doc.page.colA.props.background ? `background:${doc.page.colA.props.background};` : ''}
						onmouseover={(e) => onColMouseOver(e, 'a')}
						onmouseout={(e) => onColMouseOut(e, 'a')}
						onfocus={(e) => onColFocus(e, 'a')}
						onblur={(e) => onColBlur(e, 'a')}
						onclick={(e) => onColClick(e, 'a')}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && selectElement('col-a')}
					>
						<FlowZone
							list={doc.elements}
							containerId={null}
							direction="vertical"
							allowSections={true}
							emptyLabel="Drag components here to get started"
							fill={true}
						/>
						{#if uiState.hoveredId === 'col-a' || uiState.selectedId === 'col-a'}
							<button
								type="button"
								class="col-add-btn col-add-btn--left"
								data-tooltip="Add column to the left"
								onclick={(e) => {
									e.stopPropagation();
									addColumn('left');
								}}
							>
								<Icon name="plus" size={14} />
							</button>
							<button
								type="button"
								class="col-add-btn col-add-btn--right"
								data-tooltip="Add column to the right"
								onclick={(e) => {
									e.stopPropagation();
									addColumn('right');
								}}
							>
								<Icon name="plus" size={14} />
							</button>
						{/if}
					</div>
				{/if}
			</div>
			<PageFooterBar />
		</div>
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
		/* "safe" falls back to start-alignment once the page (now a fixed
		   size — see PAGE_SIZE_PRESETS) is bigger than the visible area,
		   instead of plain center's usual bug: a flex container can't
		   produce a negative scroll offset, so without "safe" the overflow
		   on the leading edge becomes permanently inaccessible even though
		   the container scrolls. */
		align-items: safe center;
		justify-content: safe center;
		padding: 40px;
		box-sizing: border-box;
		position: relative;
	}
	/* Floating over the canvas rather than in flow, so it never pushes the
	   page up/down and stays reachable regardless of scroll position or
	   zoom level. */
	.canvas-zoom-bar {
		position: absolute;
		left: 16px;
		bottom: 16px;
		z-index: 10;
	}
	/* Reserves the page's *scaled* footprint in the flex layout (and thus in
	   .canvas-scroll's own scrollable area) — .fi-page itself keeps its true,
	   unscaled pixel size and is only ever visually scaled via `transform`,
	   so every descendant's own width/height measurement (Gallery's column
	   math, notably) still measures real page pixels regardless of zoom. */
	.fi-page-zoom-wrap {
		flex-shrink: 0;
	}
	.fi-page {
		flex-shrink: 0;
		transform-origin: top left;
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
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}
	/* Each column becomes its own scroll container instead — the outer
	   scroller has to stop scrolling itself, or the page would still move as
	   one piece with two independently-scrolling children inside it. */
	.fi-page-scroll.independent-scroll {
		overflow: hidden;
	}
	.fi-page-scroll.independent-scroll .fi-columns {
		min-height: 0;
		height: 100%;
	}
	.fi-columns {
		display: grid;
		/* No gap — each column already has its own padding (see .fi-column
		   below), so a grid gap on top of that would double up the space
		   between them. */
		flex: 1;
		min-height: 100%;
		/* The single implicit row's default `auto` sizing shrinks/clamps to
		   fit .fi-columns's own resolved (100%-of-viewport) height instead
		   of growing for taller content — the same CSS Grid behavior
		   (auto rows sizing to the container rather than their content
		   under a definite block-size) that caused the Gallery pagination
		   bug earlier. Without this, a column with more content than fits
		   the page renders capped at the page's own height while its
		   actual content silently overflows past that box uncontained,
		   making the column's border/highlight stop short of where its
		   content visually ends. max-content lets the row (and so each
		   column, via grid's default align-items:stretch) grow past
		   min-height's 100% floor whenever content needs more.
		*/
	
		position: relative;
	}
	.fi-column {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
		padding: 24px;
		box-sizing: border-box;
		position: relative;
		border: 1px dashed transparent;
		transition:
			border-color 0.1s ease,
			background-color 0.1s ease;
	}
	/* A different color family from element selection/hover (cyan, see
	   CanvasBlock) so a selected/hovered column always reads as a distinct
	   kind of object rather than "a big element". */
	.fi-column.col-hovered {
		border-color: #c4b5fd;
	}
	.fi-column.col-selected {
		border-color: #7c3aed;
		background: rgba(124, 58, 237, 0.03);
	}
	.fi-column.independent-col {
		overflow-y: auto;
		min-height: 0;
	}
	/* A fill-height Gallery/Grid needs its own column to be a BOUNDED box
	   (capped at the page's own height, not growing for content) so it can
	   correctly compute "how much space is actually left" and paginate/clip
	   to that — the exact opposite of the default growth above. Scoped to
	   only the columns that actually host one (hasNoScrollFill, same check
	   used for independent-col) so every other column still grows normally. */
	.fi-column.has-fill {
		min-height: 0;
	}
	/* Design keeps rendering a hidden/disabled column, just dimmed — like a
	   hidden/disabled component (CanvasBlock.svelte), it needs to stay
	   reachable to edit here. Preview (PreviewModal.svelte) is what
	   actually skips or deactivates it. */
	.fi-column.col-hidden {
		opacity: 0.5;
	}
	.fi-column.col-disabled {
		opacity: 0.6;
	}
	.fi-col-divider {
		background: var(--fi-outline, #c9cdd4);
	}
	/* Inset (not protruding past the column's own edge) since .fi-page
	   clips its own overflow — a button positioned outside the column
	   would just be clipped away, especially with a single full-width
	   column that has nothing beyond its own edge to poke into. */
	.col-add-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid #7c3aed;
		background: #fff;
		color: #7c3aed;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
		z-index: 4;
	}
	.col-add-btn:hover {
		background: #7c3aed;
		color: #fff;
	}
	.col-add-btn--left {
		left: 8px;
	}
	.col-add-btn--right {
		right: 8px;
	}
	/* Sticks to the top of the visible (scrolled) viewport instead of the
	   column's own top edge — same position:sticky + height:0 trick as
	   .fi-block-toolbar (CanvasBlock.svelte): the wrapper collapses to zero
	   height so it never pushes the column's real content down, and sticks
	   within .fi-page-scroll's scrollport for as long as any part of the
	   column itself is still in view. align-self:flex-end places it at the
	   column's right edge (inset, not protruding past it — same reason as
	   .col-add-btn: .fi-page clips its own overflow, and the right column
	   sits flush against the page's own right edge with nothing beyond it
	   to poke into). */
	.col-delete-wrap {
		position: sticky;
		top: 25px;
		height: 0;
		align-self: flex-end;
		z-index: 6;
	}
	.col-delete-btn {
		width: 26px;
		height: 26px;
		border-radius: 6px;
		border: 1px solid #7c3aed;
		background: #fff;
		color: #7c3aed;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
		transform: translate(16px, -16px);
	}
	.col-delete-btn:hover {
		background: #7c3aed;
		color: #fff;
	}
	/* top (set inline, handleTop = scroll offset + half the visible
	   viewport height) keeps the handle centered in whatever's currently
	   *visible*, not at 50% of .fi-columns's own height — that could be far
	   taller than the viewport once a column's content is long enough to
	   scroll, stranding the handle off-screen at whatever point its true
	   vertical center happened to fall. Computed in JS off .fi-page-scroll's
	   own scrollTop/clientHeight rather than via position:sticky — sticky's
	   clamping range is bounded by its containing block (.fi-columns's own
	   row), which isn't guaranteed to span the column's full content height. */
	.col-resize-handle {
		position: absolute;
		width: 8px;
		height: 56px;
		padding: 0;
		transform: translate(-50%, -50%);
		border-radius: 5px;
		border: none;
		background: #7c3aed;
		cursor: col-resize;
		z-index: 5;
	}
	.col-resize-handle:hover,
	.col-resize-handle:active {
		background: #6d28d9;
	}
	.col-grid-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 3;
	}
	.col-grid-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: rgba(124, 58, 237, 0.25);
	}
	.col-grid-line.active {
		width: 2px;
		background: #7c3aed;
	}
</style>
