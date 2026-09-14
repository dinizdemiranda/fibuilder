<script>
	import Icon from './Icon.svelte';

	let { zoom, onZoomIn, onZoomOut, onZoomToFit } = $props();
</script>

<div class="zoom-controls">
	<button type="button" onclick={onZoomOut} data-tooltip="Zoom out">
		<Icon name="minus" size={14} />
	</button>
	<span class="zoom-level">{Math.round(zoom * 100)}%</span>
	<button type="button" onclick={onZoomIn} data-tooltip="Zoom in">
		<Icon name="plus" size={14} />
	</button>
	<span class="zoom-sep"></span>
	<button type="button" onclick={onZoomToFit} data-tooltip="Zoom to fit">
		<Icon name="zoomFit" size={14} />
	</button>
</div>

<style>
	.zoom-controls {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 3px;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}
	.zoom-controls button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: none;
		border-radius: 5px;
		background: none;
		color: #8a8f98;
		cursor: pointer;
	}
	.zoom-controls button:hover {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.zoom-level {
		min-width: 38px;
		text-align: center;
		font-family: system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: #5a5f68;
	}
	.zoom-sep {
		width: 1px;
		height: 18px;
		background: #e3e5e9;
		margin: 0 2px;
	}
</style>
