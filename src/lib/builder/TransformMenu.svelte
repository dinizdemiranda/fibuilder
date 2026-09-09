<script>
	import Icon from './Icon.svelte';
	import { compatibleTransformTypes } from './workflow.js';

	let { x, y, valueType, onselect, onclose } = $props();

	let options = $derived(compatibleTransformTypes(valueType));

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="wf-menu-backdrop" onclick={onclose}></div>

<div class="wf-tmenu" style="left: {x}px; top: {y}px;">
	<div class="wf-tmenu-title">Add transformation</div>
	{#if options.length === 0}
		<p class="wf-tmenu-empty">No transformations apply to this value.</p>
	{:else}
		{#each options as opt (opt.value)}
			<button type="button" onclick={() => onselect(opt.value)}>
				<Icon name={opt.icon} size={14} />
				{opt.label}
			</button>
		{/each}
	{/if}
</div>

<style>
	.wf-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1200;
	}
	.wf-tmenu {
		position: absolute;
		z-index: 1201;
		width: 190px;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		padding: 6px;
		font-family: system-ui, sans-serif;
	}
	.wf-tmenu-title {
		font-size: 10.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #8a8f98;
		padding: 4px 8px 6px;
	}
	.wf-tmenu-empty {
		margin: 0;
		padding: 6px 8px;
		font-size: 12px;
		color: #8a8f98;
	}
	.wf-tmenu button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		border: none;
		background: none;
		padding: 7px 8px;
		border-radius: 5px;
		font-family: inherit;
		font-size: 12.5px;
		color: #1a1c1e;
		cursor: pointer;
		text-align: left;
	}
	.wf-tmenu button:hover {
		background: #f0f1f3;
	}
</style>
