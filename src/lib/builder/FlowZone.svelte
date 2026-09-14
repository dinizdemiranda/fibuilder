<script>
	import { uiState, dragState, addElement, moveElement } from './state.svelte.js';
	import CanvasBlock from './CanvasBlock.svelte';
	import { blockWidthStyle, fillHeightStyle } from './layout.js';
	import { columnGridStyle } from './columnGrid.js';
	import './flow.css';

	let {
		list,
		containerId = null,
		direction = 'vertical',
		allowSections = true,
		emptyLabel = 'Drop components here',
		fill = false,
		sizing = 'auto',
		gap = null,
		justify = null,
		align = null,
		gridConfig = null // the Grid element itself (columns/rows/colTracks/rowTracks/props.fillHeight), or null for normal flow
	} = $props();

	const JUSTIFY_CSS = {
		left: 'flex-start',
		center: 'center',
		right: 'flex-end',
		around: 'space-around',
		between: 'space-between',
		evenly: 'space-evenly'
	};
	const ALIGN_CSS = {
		start: 'flex-start',
		center: 'center',
		end: 'flex-end'
	};

	let dropIndex = $state(null);
	let zoneEl;

	// A grid's `list` is fixed-size (columns*rows, one slot per zone, null for
	// empty) — a 2D drop position is approximated from the pointer's
	// fractional position across the zone's own box, which is plenty accurate
	// for landing a drag on the intended zone without measuring every child.
	function gridIndexFromPointer(clientX, clientY) {
		const rect = zoneEl.getBoundingClientRect();
		const col = Math.min(gridConfig.columns - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * gridConfig.columns)));
		const row = Math.min(gridConfig.rows - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * gridConfig.rows)));
		return Math.min(list.length - 1, row * gridConfig.columns + col);
	}

	function indexFromPointer(clientX, clientY) {
		if (!zoneEl) return list.length;
		if (gridConfig) return gridIndexFromPointer(clientX, clientY);
		const blocks = [...zoneEl.querySelectorAll(':scope > .fi-block')];
		for (let i = 0; i < blocks.length; i++) {
			const rect = blocks[i].getBoundingClientRect();
			if (direction === 'horizontal') {
				if (clientX < rect.left + rect.width / 2) return i;
			} else if (clientY < rect.top + rect.height / 2) {
				return i;
			}
		}
		return blocks.length;
	}

	let showIndicator = $derived(dragState.overContainerId === containerId);

	function onDragOver(e) {
		if (!allowSections && dragState.elementType === 'section') return;
		const idx = indexFromPointer(e.clientX, e.clientY);
		// A brand-new element (not yet anywhere) has nothing to swap an
		// occupied zone's item out for — only a move (an existing element)
		// can land on one, swapping places with whatever's already there.
		if (gridConfig && dragState.kind === 'new' && list[idx]) return;
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = dragState.kind === 'new' ? 'copy' : 'move';
		dragState.overContainerId = containerId;
		dropIndex = idx;
	}

	function onDragLeave(e) {
		if (!zoneEl?.contains(e.relatedTarget)) dropIndex = null;
	}

	function onDrop(e) {
		if (dropIndex === null) return;
		e.preventDefault();
		e.stopPropagation();
		if (dragState.kind === 'new') {
			addElement(dragState.elementType, { containerId, index: dropIndex });
		} else if (dragState.kind === 'move') {
			moveElement(dragState.elementId, { containerId, index: dropIndex });
		}
		dropIndex = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fi-flow fi-flow--{direction}"
	class:fi-flow-fill={fill}
	style="{gap !== null ? `gap:${gap}px;` : ''}{justify ? `justify-content:${JUSTIFY_CSS[justify] ?? 'flex-start'};` : ''}{align ? `align-items:${ALIGN_CSS[align] ?? 'flex-start'};` : ''}{columnGridStyle(gridConfig, gridConfig?.props?.fillHeight)}"
	bind:this={zoneEl}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	{#if gridConfig}
		{#each list as item, i (item ? item.id : `empty-${i}`)}
			<div class="fi-grid-slot" class:grid-target={showIndicator && dropIndex === i}>
				{#if item}
					<CanvasBlock element={item} selected={uiState.selectedId === item.id} style={fillHeightStyle(item, 'vertical')} />
				{:else}
					<div class="fi-grid-cell-empty">Drop here</div>
				{/if}
			</div>
		{/each}
	{:else}
		{#if list.length === 0}
			<div class="fi-flow-empty">{emptyLabel}</div>
		{/if}
		{#each list as item, i (item.id)}
			{#if showIndicator && dropIndex === i}<div class="fi-drop-indicator fi-drop-indicator--{direction}"></div>{/if}
			<CanvasBlock
				element={item}
				selected={uiState.selectedId === item.id}
				style={blockWidthStyle(direction, item.type, sizing, item.props?.fullWidth) + fillHeightStyle(item, direction)}
			/>
		{/each}
		{#if showIndicator && dropIndex === list.length && list.length > 0}
			<div class="fi-drop-indicator fi-drop-indicator--{direction}"></div>
		{/if}
	{/if}
</div>
