<script>
	import Icon from '../Icon.svelte';

	let { options, value, onchange } = $props();
</script>

<div class="vp-grid">
	{#each options as opt (opt.value)}
		<button type="button" class="vp-item" class:active={value === opt.value} onclick={() => onchange(opt.value)}>
			<span class="vp-icon-box"><Icon name={opt.icon} size={20} /></span>
			<span class="vp-label">{opt.label}</span>
		</button>
	{/each}
</div>

<style>
	.vp-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.vp-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		width: 78px;
		padding: 2px 0;
		background: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
	}
	.vp-icon-box {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: #eceef1;
		border: 1px solid #e2e4e8;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
		box-sizing: border-box;
	}
	.vp-item:hover .vp-icon-box {
		border-color: #0b57d0;
		background: #f2f6fe;
		color: #0b57d0;
	}
	.vp-item.active .vp-icon-box {
		border-color: #0b57d0;
		border-width: 2px;
		background: #f2f6fe;
		color: #0b57d0;
	}
	.vp-label {
		font-size: 10px;
		color: #2b2e33;
		text-align: center;
		line-height: 1.2;
	}
	.vp-item.active .vp-label {
		color: #0b57d0;
		font-weight: 600;
	}
</style>
