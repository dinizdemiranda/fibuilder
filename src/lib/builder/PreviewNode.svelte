<script>
	import ElementRenderer from './ElementRenderer.svelte';
	import { blockWidthStyle, fillHeightStyle } from './layout.js';
	import { resolveProp } from './bindings.js';
	import PreviewNode from './PreviewNode.svelte';
	import './flow.css';

	let { element, direction = 'vertical', sizing = 'auto' } = $props();

	let isHidden = $derived(resolveProp(element, 'hidden') === 'true');
	let isDisabled = $derived(resolveProp(element, 'disabled') === 'true');
</script>

{#if !isHidden}
	<div
		style={blockWidthStyle(direction, element.type, sizing) + fillHeightStyle(element, direction)}
		class:fi-inactive={isDisabled}
	>
		{#if element.type === 'section'}
			<div class="fi-flow fi-flow--{element.direction}" style="gap:{element.gap}px;">
				{#each element.children as child (child.id)}
					<PreviewNode element={child} direction={element.direction} sizing={element.itemSizing} />
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
