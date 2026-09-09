<script>
	import Icon from './Icon.svelte';
	import { labelFields, fieldEndpoint, edgeInto, disconnectEdge, describeFromEndpoint } from './workflow.js';

	let { labelId } = $props();

	let fields = $derived(labelFields(labelId));
</script>

{#if fields.length === 0}
	<p class="wf-empty">No required fields.</p>
{:else}
	{#each fields as field (field.name)}
		{@const endpoint = fieldEndpoint(labelId, field.name)}
		{@const conn = edgeInto(endpoint)}
		{@const from = conn ? describeFromEndpoint(conn.from) : null}
		<div class="wf-row" class:has-conn={!!conn}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="wf-socket wf-socket-in"
				class:connected={!!conn}
				data-tooltip={field.name}
				data-wf-input
				data-wf-input-kind="field"
				data-label-id={labelId}
				data-field={field.name}
			></div>
			{#if conn}
				{#if from}
					<Icon name={from.icon} size={12} />
					<span
						class="wf-row-name wf-bound"
						class:wf-variable={from.variable}
						style={from.transform ? `color: ${from.color ?? '#b8860b'};` : ''}>{from.name}</span
					>
				{:else}
					<span class="wf-row-name wf-bound-missing">Deleted source</span>
				{/if}
				<span class="wf-row-field">→ {field.name}</span>
				<button type="button" class="wf-unlink" data-tooltip="Disconnect" onclick={() => disconnectEdge(conn.id)}>
					<Icon name="close" size={10} />
				</button>
			{:else}
				<span class="wf-row-name">{field.name}</span>
				<span class="wf-row-type">{field.data_type}</span>
			{/if}
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
		gap: 6px;
		padding: 0 8px 0 18px;
		color: #1a1c1e;
	}
	.wf-row-name {
		font-size: 12.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.wf-row-type {
		margin-left: auto;
		font-size: 10px;
		color: #8a8f98;
		flex-shrink: 0;
	}
	.wf-row.has-conn .wf-row-name {
		flex-shrink: 0;
		max-width: 90px;
	}
	.wf-bound {
		color: #0b57d0;
	}
	.wf-variable {
		color: #7c3aed;
	}
	.wf-bound-missing {
		color: #b3261e;
		font-style: italic;
	}
	.wf-row-field {
		flex: 1;
		min-width: 0;
		font-size: 11px;
		color: #8a8f98;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.wf-unlink {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: none;
		background: #f5f5f6;
		color: #5a5f68;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
	}
	.wf-unlink:hover {
		background: #fef2f2;
		color: #b3261e;
	}
	.wf-socket {
		position: absolute;
		left: -6px;
		top: 50%;
		transform: translateY(-50%);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid #8a8f98;
		flex-shrink: 0;
	}
	.wf-socket.connected {
		border-color: #0b57d0;
		background: #0b57d0;
	}
</style>
