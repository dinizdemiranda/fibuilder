<script>
	import Icon from '../Icon.svelte';
	import { setValueTargetCandidates } from '../events.js';
	import { doc } from '../state.svelte.js';

	let { element, source, event, onclose } = $props();
	// svelte-ignore state_referenced_locally -- event is fixed for this popover's lifetime (it's remounted fresh each time it opens)
	const isNew = !event;

	// svelte-ignore state_referenced_locally -- read once, only to seed a fresh draft's default target below
	const initialTargets = setValueTargetCandidates(element.id);

	function freshEvent() {
		return {
			id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			trigger: 'select',
			action: 'controlComponent',
			targetId: initialTargets[0]?.id ?? '',
			variableId: '',
			column: ''
		};
	}

	// Draft, committed to element.events only on OK — closing any other way
	// (X, outside click, Escape) discards it untouched, same as the other
	// event/condition/filter popovers.
	// svelte-ignore state_referenced_locally -- seeds the draft once when this popover mounts
	let draft = $state(event ? structuredClone($state.snapshot(event)) : freshEvent());

	let targets = $derived(setValueTargetCandidates(element.id));
	let canSave = $derived(!!draft.column && (draft.action === 'setVariable' ? !!draft.variableId : !!draft.targetId));

	function onActionChange(e) {
		draft.action = e.currentTarget.value;
		draft.targetId = draft.action === 'controlComponent' ? (targets[0]?.id ?? '') : '';
		draft.variableId = '';
	}

	function ok() {
		if (!canSave) return;
		if (!element.events) element.events = [];
		if (isNew) {
			element.events.push(draft);
		} else {
			const idx = element.events.findIndex((e) => e.id === draft.id);
			if (idx !== -1) element.events[idx] = draft;
		}
		onclose();
	}

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bpop-backdrop" onclick={onclose}></div>

<div class="bpop-panel">
	<div class="bpop-header">
		<span class="bpop-title">{isNew ? 'Add event' : 'Edit event'}</span>
		<button type="button" class="bpop-close" onclick={onclose} data-tooltip="Close">
			<Icon name="close" size={13} />
		</button>
	</div>

	<div class="bpop-body">
		<div class="prop-field">
			<label class="prop-label" for="dle-trigger">Event</label>
			<select id="dle-trigger" class="ctrl-select" bind:value={draft.trigger}>
				<option value="select">On Select</option>
			</select>
		</div>

		<div class="prop-field">
			<label class="prop-label" for="dle-action">Action</label>
			<select id="dle-action" class="ctrl-select" value={draft.action} onchange={onActionChange}>
				<option value="controlComponent">Set a field</option>
				<option value="setVariable">Set a variable</option>
			</select>
		</div>

		{#if draft.action === 'setVariable'}
			{#if doc.variables.length === 0}
				<p class="prop-hint">No variables yet — create one in the Data tab first.</p>
			{:else}
				<div class="prop-field">
					<label class="prop-label" for="dle-variable">Variable</label>
					<select id="dle-variable" class="ctrl-select" bind:value={draft.variableId}>
						<option value="">Select a variable…</option>
						{#each doc.variables as v (v.id)}
							<option value={v.id}>{v.name}</option>
						{/each}
					</select>
				</div>
			{/if}
		{:else if targets.length === 0}
			<p class="prop-hint">No components can be set directly yet.</p>
		{:else}
			<div class="prop-field">
				<label class="prop-label" for="dle-target">Component</label>
				<select id="dle-target" class="ctrl-select" bind:value={draft.targetId}>
					<option value="">Select a component…</option>
					{#each targets as t (t.id)}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="prop-field">
			<label class="prop-label" for="dle-column">Column</label>
			<select id="dle-column" class="ctrl-select" bind:value={draft.column}>
				<option value="">Select a column…</option>
				{#each source.columns as col (col)}
					<option value={col}>{col}</option>
				{/each}
			</select>
		</div>
		<p class="prop-hint">Uses that column's value from whichever row is selected.</p>

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
		max-height: 560px;
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
		gap: 4px;
	}
	/* Label-left, field-right rows, scoped to this popover only. */
	.bpop-body :global(.prop-field) {
		flex-direction: row;
		align-items: center;
		margin-bottom: 0;
		padding: 6px 0;
		gap: 10px;
	}
	.bpop-body :global(.prop-label) {
		flex-shrink: 0;
		width: 78px;
	}
	.bpop-body :global(.prop-field > .ctrl-select) {
		flex: 1;
		min-width: 0;
	}
	.bpop-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 10px;
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
