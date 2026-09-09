<script>
	import { containFit } from './layout.js';
	import { buildSampleBindings } from './labels.js';
	import LabelElementView from './LabelElementView.svelte';

	let { label } = $props();

	let containerW = $state(0);
	let containerH = $state(0);

	let fitted = $derived(containFit(label.dimensions.width, label.dimensions.height, containerW, containerH));
	let scale = $derived(fitted.width > 0 ? fitted.width / label.dimensions.width : 0);
	let bindings = $derived(buildSampleBindings(label));
</script>

<div class="label-canvas-wrap" bind:clientWidth={containerW} bind:clientHeight={containerH}>
	{#if fitted.width > 0 && fitted.height > 0}
		<div class="label-canvas" style="width:{fitted.width}px; height:{fitted.height}px;">
			{#each label.elements as el (label.id + ':' + el.id)}
				<LabelElementView element={el} {scale} {bindings} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.label-canvas-wrap {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.label-canvas {
		position: relative;
		flex-shrink: 0;
		background: #fff;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
</style>
