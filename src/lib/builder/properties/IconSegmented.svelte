<script>
	import Icon from '../Icon.svelte';

	let { options, value, onchange } = $props();
</script>

<div class="icon-segmented">
	{#each options as opt (opt.value)}
		<button type="button" class:active={value === opt.value} onclick={() => onchange(opt.value)} data-tooltip={opt.label}>
			<Icon name={opt.icon} size={14} />
		</button>
	{/each}
</div>

<style>
	.icon-segmented {
		display: flex;
		border: 1px solid #d3d6db;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
	}
	.icon-segmented button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 7px 8px;
		border: none;
		background: #fff;
		cursor: pointer;
		color: #5a5f68;
	}
	.icon-segmented button.active {
		background: #0b57d0;
		color: #fff;
	}
	.icon-segmented button + button {
		border-left: 1px solid #d3d6db;
	}
</style>
