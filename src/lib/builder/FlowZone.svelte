<script>
	import { uiState, dragState, addElement, moveElement } from './state.svelte.js';
	import CanvasBlock from './CanvasBlock.svelte';
	import { blockWidthStyle, fillHeightStyle } from './layout.js';
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
		justify = null
	} = $props();

	const JUSTIFY_CSS = {
		left: 'flex-start',
		center: 'center',
		right: 'flex-end',
		around: 'space-around',
		between: 'space-between',
		evenly: 'space-evenly'
	};

	let dropIndex = $state(null);
	let zoneEl;

	function indexFromPointer(clientX, clientY) {
		if (!zoneEl) return list.length;
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

	function rejected() {
		return !allowSections && dragState.elementType === 'section';
	}

	function onDragOver(e) {
		if (rejected()) return;
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = dragState.kind === 'new' ? 'copy' : 'move';
		dragState.overContainerId = containerId;
		dropIndex = indexFromPointer(e.clientX, e.clientY);
	}

	function onDragLeave(e) {
		if (!zoneEl?.contains(e.relatedTarget)) dropIndex = null;
	}

	let showIndicator = $derived(dragState.overContainerId === containerId);

	function onDrop(e) {
		if (rejected()) return;
		e.preventDefault();
		e.stopPropagation();
		const index = dropIndex ?? list.length;
		if (dragState.kind === 'new') {
			addElement(dragState.elementType, { containerId, index });
		} else if (dragState.kind === 'move') {
			moveElement(dragState.elementId, { containerId, index });
		}
		dropIndex = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fi-flow fi-flow--{direction}"
	class:fi-flow-fill={fill}
	style="{gap !== null ? `gap:${gap}px;` : ''}{justify ? `justify-content:${JUSTIFY_CSS[justify] ?? 'flex-start'};` : ''}"
	bind:this={zoneEl}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	{#if list.length === 0}
		<div class="fi-flow-empty">{emptyLabel}</div>
	{/if}
	{#each list as item, i (item.id)}
		{#if showIndicator && dropIndex === i}<div class="fi-drop-indicator fi-drop-indicator--{direction}"></div>{/if}
		<CanvasBlock
			element={item}
			selected={uiState.selectedId === item.id}
			style={blockWidthStyle(direction, item.type, sizing) + fillHeightStyle(item, direction)}
		/>
	{/each}
	{#if showIndicator && dropIndex === list.length && list.length > 0}
		<div class="fi-drop-indicator fi-drop-indicator--{direction}"></div>
	{/if}
</div>
