<script>
	import Icon from './Icon.svelte';
	import { NODE_WIDTH, LABEL_THUMB_H } from './workflow.js';

	let { x, y, title, icon, thumbnail = null, variant = 'default', onHeaderMouseDown, children } = $props();
</script>

<div class="wf-node" class:important={variant === 'page'} style="left: {x}px; top: {y}px; width: {NODE_WIDTH}px;">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="wf-node-header" class:stacked={!!thumbnail} onmousedown={onHeaderMouseDown}>
		{#if thumbnail}
			<img class="wf-node-header-thumb" style="height: {LABEL_THUMB_H}px;" src={thumbnail} alt="" />
		{/if}
		<div class="wf-node-header-row">
			{#if !thumbnail}<Icon name={icon} size={13} />{/if}
			<span class="wf-node-title">{title}</span>
		</div>
	</div>
	<div class="wf-node-body">
		{@render children()}
	</div>
</div>

<style>
	.wf-node {
		position: absolute;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 10px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
		font-family: system-ui, sans-serif;
		user-select: none;
	}
	/* The Page node is the one everything else hangs off of — give it a
	   deliberately heavier, branded treatment so it reads as the anchor of
	   the graph rather than just another node. */
	.wf-node.important {
		border: 1.5px solid #0b57d0;
		box-shadow: 0 6px 20px rgba(11, 87, 208, 0.22);
	}
	.wf-node.important .wf-node-header {
		background: #0b57d0;
		color: #fff;
		border-bottom-color: #0a4bb8;
	}
	.wf-node-header {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 12px;
		border-bottom: 1px solid #eceef1;
		color: #1a1c1e;
		font-size: 12.5px;
		font-weight: 600;
		cursor: grab;
		border-radius: 10px 10px 0 0;
		background: #fafafb;
		box-sizing: border-box;
	}
	.wf-node-header:active {
		cursor: grabbing;
	}
	/* A label node with real art: the thumbnail sits above the name, big
	   enough to actually recognize the label by — same idea as the Labels
	   sidebar's own thumbnail cards. */
	.wf-node-header.stacked {
		flex-direction: column;
		align-items: stretch;
		height: auto;
		padding: 0;
	}
	.wf-node-header-thumb {
		width: 100%;
		object-fit: contain;
		background: #fff;
		box-sizing: border-box;
		padding: 8px;
		border-radius: 10px 10px 0 0;
	}
	.wf-node-header-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}
	.wf-node-header.stacked .wf-node-header-row {
		height: 40px;
		padding: 0 12px;
		border-top: 1px solid #eceef1;
		box-sizing: border-box;
	}
	.wf-node-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.wf-node-body {
		padding: 6px 0;
	}
</style>
