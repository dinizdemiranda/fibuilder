<script>
	import { doc, setPreviewOverride } from '../state.svelte.js';
	import { getLabelById, getLabelThumbnail, formatDimensions } from '../labels.js';
	import Icon from '../Icon.svelte';

	let { element } = $props();

	// Single-select, and — same as the import picker's preview pane — the
	// first available label is always selected and can only be swapped, not
	// cleared.
	let selectedId = $derived(element.props.selectedLabelId ?? doc.labels[0] ?? null);
	let isList = $derived(element.props.layout === 'list');

	// `element` here is ElementRenderer's effectiveElement — a fresh plain
	// copy recomputed every render, so writing straight to its props would
	// vanish on the next render. Going through setPreviewOverride (the same
	// mechanism every other interactive element uses) is what actually
	// reaches resolveProp on the next read.
	function select(id) {
		setPreviewOverride(element.id, 'selectedLabelId', id);
	}
</script>

<div class="label-selector-el" class:list={isList}>
	{#each doc.labels as id (id)}
		{@const label = getLabelById(id)}
		{#if label}
			<button type="button" class="ls-item" class:active={selectedId === id} onclick={() => select(id)}>
				<span class="ls-thumb">
					{#if getLabelThumbnail(id)}
						<img src={getLabelThumbnail(id)} alt={label.name} />
					{:else}
						<Icon name="label" size={30} />
					{/if}
				</span>
				<span class="ls-text">
					<span class="ls-name">{label.name}</span>
					<span class="ls-dims">{formatDimensions(label)}</span>
				</span>
			</button>
		{/if}
	{/each}
	{#if doc.labels.length === 0}
		<div class="ls-empty">No labels imported yet</div>
	{/if}
</div>

<style>
	.label-selector-el {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-family: var(--fi-font);
	}
	.label-selector-el.list {
		flex-direction: column;
		flex-wrap: nowrap;
		gap: 8px;
	}
	.ls-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		width: 100px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.list .ls-item {
		flex-direction: row;
		align-items: center;
		width: 100%;
		gap: 12px;
	}
	.ls-thumb {
		width: 100%;
		height: 88px;
		border-radius: var(--fi-radius);
		background: var(--fi-surface);
		border: 1px solid var(--fi-outline);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fi-on-surface-variant);
		box-sizing: border-box;
		overflow: hidden;
		flex-shrink: 0;
	}
	.list .ls-thumb {
		width: 64px;
		height: 64px;
	}
	.ls-thumb img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 5px;
		box-sizing: border-box;
	}
	.ls-item.active .ls-thumb {
		border-color: var(--fi-primary);
		border-width: 2px;
		background: rgba(11, 87, 208, 0.06);
		color: var(--fi-primary);
	}
	.ls-text {
		display: flex;
		flex-direction: column;
	}
	.list .ls-text {
		align-items: flex-start;
		text-align: left;
	}
	.ls-name {
		font-size: 11px;
		color: var(--fi-on-surface);
		text-align: center;
		line-height: 1.25;
	}
	.list .ls-name {
		font-size: 13px;
		font-weight: 500;
		text-align: left;
	}
	.ls-dims {
		font-size: 10px;
		color: var(--fi-on-surface-variant);
		text-align: center;
		margin-top: -4px;
	}
	.list .ls-dims {
		text-align: left;
		margin-top: 2px;
	}
	.ls-empty {
		color: var(--fi-on-surface-variant);
		font-size: 12px;
	}
</style>
