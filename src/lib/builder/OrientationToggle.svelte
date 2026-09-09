<script>
	import Icon from './Icon.svelte';

	let { value, onchange } = $props();
</script>

<div class="orientation-toggle">
	<button type="button" class:active={value === 'landscape'} data-tooltip="Landscape" onclick={() => onchange('landscape')}>
		<Icon name="landscape" size={16} />
	</button>
	<button type="button" class:active={value === 'portrait'} data-tooltip="Portrait" onclick={() => onchange('portrait')}>
		<Icon name="portrait" size={16} />
	</button>
</div>

<style>
	.orientation-toggle {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}
	.orientation-toggle button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 26px;
		border: none;
		border-radius: 5px;
		background: none;
		color: #8a8f98;
		cursor: pointer;
	}
	.orientation-toggle button:hover {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.orientation-toggle button.active {
		background: #0b57d0;
		color: #fff;
	}
</style>
