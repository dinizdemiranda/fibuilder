<script>
	import Icon from '../Icon.svelte';
	import Segmented from './Segmented.svelte';
	import { FILTER_OPERATORS, operatorNeedsValue, operatorNeedsSecondValue, filterSourceCandidates } from '../dataLookup.js';

	let { element, source, filter, onclose } = $props();
	// svelte-ignore state_referenced_locally -- filter is fixed for this popover's lifetime (it's remounted fresh each time it opens)
	const isNew = !filter;

	function freshFilter() {
		return {
			id: `filter_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			column: '',
			operator: 'equals',
			valueMode: 'static',
			value: '',
			value2: '',
			sourceId: '',
			sourceId2: ''
		};
	}

	// Draft, committed to element.props.filters only on OK — closing any other
	// way (X, outside click, Escape) discards it untouched.
	// svelte-ignore state_referenced_locally -- seeds the draft once when this popover mounts
	let draft = $state(filter ? { ...filter } : freshFilter());

	let candidates = $derived(filterSourceCandidates().filter((c) => c.id !== element.id));
	let componentCandidates = $derived(candidates.filter((c) => c.type !== 'variable'));
	let variableCandidates = $derived(candidates.filter((c) => c.type === 'variable'));
	let canSave = $derived(!!draft.column);

	function ok() {
		if (!canSave) return;
		if (!element.props.filters) element.props.filters = [];
		if (isNew) {
			element.props.filters.push(draft);
		} else {
			const idx = element.props.filters.findIndex((f) => f.id === draft.id);
			if (idx !== -1) element.props.filters[idx] = draft;
		}
		onclose();
	}

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#snippet valueSlot(which)}
	{#if draft.valueMode === 'reference'}
		<select class="ctrl-select" bind:value={draft[`sourceId${which}`]}>
			<option value="">Select a field…</option>
			{#if componentCandidates.length}
				<optgroup label="Components">
					{#each componentCandidates as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</optgroup>
			{/if}
			{#if variableCandidates.length}
				<optgroup label="Variables">
					{#each variableCandidates as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</optgroup>
			{/if}
		</select>
	{:else}
		<input class="ctrl-text" type="text" placeholder="Value" bind:value={draft[`value${which}`]} />
	{/if}
{/snippet}

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bpop-backdrop" onclick={onclose}></div>

<div class="bpop-panel">
	<div class="bpop-header">
		<span class="bpop-title">{isNew ? 'Add filter' : 'Edit filter'}</span>
		<button type="button" class="bpop-close" onclick={onclose} data-tooltip="Close">
			<Icon name="close" size={13} />
		</button>
	</div>

	<div class="bpop-body">
		<div class="prop-field">
			<label class="prop-label" for="flt-column">Column</label>
			<select id="flt-column" class="ctrl-select" bind:value={draft.column}>
				<option value="">Select a column…</option>
				{#each source.columns as col (col)}
					<option value={col}>{col}</option>
				{/each}
			</select>
		</div>

		<div class="prop-field">
			<label class="prop-label" for="flt-operator">Operator</label>
			<select id="flt-operator" class="ctrl-select" bind:value={draft.operator}>
				{#each FILTER_OPERATORS as op (op.value)}
					<option value={op.value}>{op.label}</option>
				{/each}
			</select>
		</div>

		{#if operatorNeedsValue(draft.operator)}
			<div class="prop-field">
				<span class="prop-label">Value from</span>
				<Segmented
					options={[
						{ value: 'static', label: 'Static' },
						{ value: 'reference', label: 'Component' }
					]}
					value={draft.valueMode}
					onchange={(v) => (draft.valueMode = v)}
				/>
			</div>
			<div class="prop-field">
				<label class="prop-label" for="flt-value">{operatorNeedsSecondValue(draft.operator) ? 'From' : 'Value'}</label>
				{@render valueSlot('')}
			</div>
			{#if operatorNeedsSecondValue(draft.operator)}
				<div class="prop-field">
					<label class="prop-label" for="flt-value2">To</label>
					{@render valueSlot('2')}
				</div>
			{/if}
		{/if}

		<div class="bpop-footer">
			<span></span>
			<button type="button" class="bpop-ok" disabled={!canSave} onclick={ok}>OK</button>
		</div>
	</div>
</div>

<style>
	.bpop-backdrop {
		position: absolute;
		inset: 0;
		background: transparent;
		z-index: 1000;
	}
	.bpop-panel {
		position: absolute;
		right: 300px;
		top: 32px;
		bottom: 32px;
		width: 320px;
		max-height: 600px;
		z-index: 1001;
		background: #fff;
		border-radius: 12px 0 0 12px;
		border: 1px solid #e2e4e8;
		border-right: none;
		box-shadow: -8px 0 24px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
		height: fit-content;
	}
	.bpop-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid #e2e4e8;
	}
	.bpop-title {
		font-size: 13px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.bpop-close {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #f5f5f6;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
		cursor: pointer;
		flex-shrink: 0;
	}
	.bpop-close:hover {
		background: #eceef1;
		color: #1a1c1e;
	}
	.bpop-body {
		padding: 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.bpop-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 4px;
	}
	.bpop-ok {
		background: #0b57d0;
		color: #fff;
		border: none;
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 8px 20px;
		border-radius: 6px;
		cursor: pointer;
	}
	.bpop-ok:hover {
		background: #0a4bb8;
	}
	.bpop-ok:disabled {
		background: #c9cdd4;
		cursor: not-allowed;
	}
</style>
