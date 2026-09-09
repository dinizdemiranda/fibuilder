<script>
	import Icon from './Icon.svelte';
	import { nowValue } from './bindings.js';
	import { GENERATOR_TYPES, NODE_WIDTH, renameTransform } from './workflow.js';

	let { generator, onHeaderMouseDown, onOutputMouseDown, onRemove } = $props();

	let def = $derived(GENERATOR_TYPES.find((g) => g.value === generator.type));
	let sampleOut = $derived(nowValue());

	let editingName = $state(false);
	// svelte-ignore state_referenced_locally -- seeds the draft once; startEditName/commitName resync it on each edit
	let nameDraft = $state(generator.name);
	let nameInputEl = $state(null);

	$effect(() => {
		if (editingName && nameInputEl) {
			nameInputEl.focus();
			nameInputEl.select();
		}
	});

	function startEditName(e) {
		e.stopPropagation();
		nameDraft = generator.name;
		editingName = true;
	}
	function commitName() {
		renameTransform(generator.id, nameDraft);
		editingName = false;
	}
	function cancelName() {
		nameDraft = generator.name;
		editingName = false;
	}
</script>

<div
	class="wf-tnode"
	style="left: {generator.x}px; top: {generator.y}px; width: {NODE_WIDTH}px; --tcolor: {def?.color ?? '#8a8f98'};"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="wf-tnode-header" onmousedown={onHeaderMouseDown}>
		<Icon name={def?.icon ?? 'calendar'} size={13} />
		{#if editingName}
			<input
				bind:this={nameInputEl}
				class="wf-tnode-name-input"
				type="text"
				bind:value={nameDraft}
				onmousedown={(e) => e.stopPropagation()}
				onblur={commitName}
				onkeydown={(e) => {
					if (e.key === 'Enter') commitName();
					if (e.key === 'Escape') cancelName();
				}}
			/>
		{:else}
			<button type="button" class="wf-tnode-title" onmousedown={(e) => e.stopPropagation()} onclick={startEditName} data-tooltip="Click to rename">
				{generator.name}
			</button>
		{/if}
		<button type="button" class="wf-tnode-remove" data-tooltip="Remove" onmousedown={(e) => e.stopPropagation()} onclick={() => onRemove(generator.id)}>
			<Icon name="close" size={11} />
		</button>
	</div>

	<div class="wf-tnode-sample">
		<span class="wf-tnode-sample-value wf-tnode-sample-out wf-gen-value" data-tooltip={sampleOut}>{sampleOut}</span>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="wf-socket wf-socket-out" data-tooltip="Drag to connect" onmousedown={(e) => onOutputMouseDown(e)}></div>
	</div>
</div>

<style>
	/* Same node chrome as a transform (.wf-tnode in TransformNode.svelte) so
	   generator nodes read as the same family of thing on the canvas — just
	   with no input row/socket, since a generator manufactures its value
	   instead of transforming an upstream one. */
	.wf-tnode {
		position: absolute;
		background: color-mix(in srgb, var(--tcolor) 6%, #fff);
		border: 1px solid color-mix(in srgb, var(--tcolor) 45%, #fff);
		border-radius: 10px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
		font-family: system-ui, sans-serif;
		user-select: none;
	}
	.wf-tnode-header {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 40px;
		padding: 0 10px;
		border-bottom: 1px solid color-mix(in srgb, var(--tcolor) 30%, #fff);
		color: color-mix(in srgb, var(--tcolor) 75%, #000);
		font-size: 12px;
		font-weight: 600;
		cursor: grab;
		border-radius: 10px 10px 0 0;
		background: color-mix(in srgb, var(--tcolor) 16%, #fff);
	}
	.wf-tnode-header:active {
		cursor: grabbing;
	}
	.wf-tnode-title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: left;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: text;
	}
	.wf-tnode-name-input {
		flex: 1;
		min-width: 0;
		font: inherit;
		color: #1a1c1e;
		padding: 2px 4px;
		border: 1px solid var(--tcolor);
		border-radius: 4px;
		background: #fff;
		outline: none;
	}
	.wf-tnode-remove {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.06);
		color: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
	}
	.wf-tnode-remove:hover {
		background: #fde3e3;
		color: #b3261e;
	}
	.wf-tnode-sample {
		position: relative;
		height: 34px;
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 0 18px;
		background: color-mix(in srgb, var(--tcolor) 5%, #fff);
		font-size: 11px;
		font-family: 'SFMono-Regular', Consolas, monospace;
		/* This is the node's last child (no settings body below it, unlike a
		   transform node) — its own square corners would otherwise poke out
		   past .wf-tnode's rounded bottom edge. */
		border-radius: 0 0 9px 9px;
	}
	.wf-gen-value {
		margin-left: auto;
	}
	.wf-tnode-sample-value {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.wf-tnode-sample-out {
		color: color-mix(in srgb, var(--tcolor) 80%, #000);
		font-weight: 600;
	}
	.wf-socket {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid var(--tcolor);
		flex-shrink: 0;
		cursor: crosshair;
	}
	.wf-socket-out {
		right: -6px;
	}
</style>
