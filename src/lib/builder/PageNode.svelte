<script>
	import Icon from './Icon.svelte';
	import { pageSources, sourceIcon, sourceEndpoint, edgesFrom } from './workflow.js';

	let { onSocketMouseDown } = $props();

	let sources = $derived(pageSources());
</script>

{#if sources.length === 0}
	<p class="wf-empty">No editable components or variables yet.</p>
{:else}
	{#each sources as source (source.id)}
		{@const endpoint = sourceEndpoint(source.id)}
		{@const connected = edgesFrom(endpoint).length > 0}
		<div class="wf-row">
			<Icon name={sourceIcon(source)} size={13} />
			<span class="wf-row-name" class:wf-variable={source.type === 'variable'}>{source.name}</span>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="wf-socket wf-socket-out"
				class:connected
				data-tooltip="Drag to connect"
				onmousedown={(e) => onSocketMouseDown(endpoint, e)}
			></div>
		</div>
	{/each}
{/if}

<style>
	.wf-empty {
		margin: 4px 12px;
		font-size: 12px;
		color: #8a8f98;
	}
	.wf-row {
		position: relative;
		height: 34px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 16px 0 12px;
		color: #1a1c1e;
	}
	.wf-row-name {
		flex: 1;
		min-width: 0;
		font-size: 12.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.wf-variable {
		color: #7c3aed;
	}
	.wf-socket {
		position: absolute;
		right: -6px;
		top: 50%;
		transform: translateY(-50%);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid #8a8f98;
		cursor: crosshair;
	}
	.wf-socket:hover {
		border-color: #0b57d0;
		background: #e8f0fe;
	}
	.wf-socket.connected {
		border-color: #0b57d0;
		background: #0b57d0;
	}
</style>
