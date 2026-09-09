<script>
	import { getLabelById } from '../labels.js';
	import { selectedLabelId } from '../workflow.js';
	import LabelCanvas from '../LabelCanvas.svelte';

	let { element } = $props();

	// Always follows whatever a Label Selector module on the page currently
	// has selected (which itself falls back to the first imported label) —
	// there's no way to pin this module to one specific label.
	let labelId = $derived(selectedLabelId());
	let label = $derived(labelId ? getLabelById(labelId) : null);
</script>

<div
	class="label-preview-el"
	class:fill={element.props.fillHeight}
	style={element.props.fillHeight ? '' : `height:${element.props.fixedHeight || 220}px;`}
>
	{#if label}
		<LabelCanvas {label} />
	{:else}
		<div class="label-preview-empty">No label selected</div>
	{/if}
</div>

<style>
	.label-preview-el {
		width: 100%;
		background: #f1f2f4;
		border: 1px solid #c9cdd4;
		border-radius: var(--fi-radius);
		box-sizing: border-box;
		padding: 12px;
	}
	.label-preview-el.fill {
		height: 100%;
		min-height: 220px;
	}
	.label-preview-empty {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9aa0a8;
		font-family: var(--fi-font);
		font-size: 12px;
	}
</style>
