<script>
	import ElementRenderer from './ElementRenderer.svelte';
	import { blockWidthStyle, fillHeightStyle } from './layout.js';
	import { resolveProp } from './bindings.js';
	import { columnGridStyle } from './columnGrid.js';
	import PreviewNode from './PreviewNode.svelte';
	import './flow.css';

	let { element, direction = 'vertical', sizing = 'auto' } = $props();

	let isHidden = $derived(resolveProp(element, 'hidden') === 'true');
	let isDisabled = $derived(resolveProp(element, 'disabled') === 'true');

	// Mirrors FlowZone.svelte's own JUSTIFY_CSS/ALIGN_CSS — Preview renders
	// sections through this separate lightweight path rather than FlowZone
	// itself, so both maps (and the same align:'end' default CanvasBlock
	// applies) need to stay duplicated here to keep Design and Preview
	// looking identical.
	const JUSTIFY_CSS = {
		left: 'flex-start',
		center: 'center',
		right: 'flex-end',
		around: 'space-around',
		between: 'space-between',
		evenly: 'space-evenly'
	};
	const ALIGN_CSS = { start: 'flex-start', center: 'center', end: 'flex-end' };

	function sectionFlowStyle(section) {
		const justify = JUSTIFY_CSS[section.justify] ?? 'flex-start';
		const align = ALIGN_CSS[section.align ?? 'end'] ?? 'flex-end';
		return `gap:${section.gap}px; justify-content:${justify}; align-items:${align};`;
	}
</script>

{#if !isHidden}
	<div
		style={blockWidthStyle(direction, element.type, sizing, element.props?.fullWidth) + fillHeightStyle(element, direction)}
		class:fi-inactive={isDisabled}
	>
		{#if element.type === 'section'}
			<div class="fi-flow fi-flow--{element.direction}" style={sectionFlowStyle(element)}>
				{#each element.children as child (child.id)}
					<PreviewNode element={child} direction={element.direction} sizing={element.itemSizing} />
				{/each}
			</div>
		{:else if element.type === 'grid'}
			<div class="fi-flow fi-flow--vertical" style={columnGridStyle(element, element.props.fillHeight)}>
				{#each element.children as child, i (child ? child.id : `empty-${i}`)}
					{#if child}
						<PreviewNode element={child} />
					{:else}
						<div></div>
					{/if}
				{/each}
			</div>
		{:else}
			<ElementRenderer {element} preview />
		{/if}
	</div>
{/if}

<style>
	.fi-inactive {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
