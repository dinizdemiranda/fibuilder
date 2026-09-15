<script>
	import Icon from '../Icon.svelte';
	import Segmented from './Segmented.svelte';
	import ExpressionField from './ExpressionField.svelte';
	import { controlTargetCandidates, CONTROL_METHODS, METHOD_LABELS, VARIABLE_METHOD_LABELS } from '../events.js';
	import { VALUE_TYPE } from '../bindings.js';
	import { doc } from '../state.svelte.js';
	import { getLabelById } from '../labels.js';

	let { element, event, onclose } = $props();
	// svelte-ignore state_referenced_locally -- event is fixed for this popover's lifetime (it's remounted fresh each time it opens)
	const isNew = !event;

	// svelte-ignore state_referenced_locally -- read once, only to seed a fresh draft's default target below
	const initialTargets = controlTargetCandidates(element.id);

	function freshEvent() {
		return {
			id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			trigger: 'click',
			action: 'controlComponent',
			targetId: initialTargets[0]?.id ?? '',
			method: '',
			direction: '',
			variableId: '',
			varMethod: '',
			props: { value: '' },
			bindings: {}
		};
	}

	// Draft, committed to element.events only on OK — closing any other way
	// (X, outside click, Escape) discards it untouched, same as the condition
	// popover.
	// svelte-ignore state_referenced_locally -- seeds the draft once when this popover mounts
	// event is a live $state proxy (element.events[i]) — structuredClone can't
	// clone a Proxy directly, so unwrap it to a plain object first.
	let draft = $state(event ? structuredClone($state.snapshot(event)) : freshEvent());

	let targets = $derived(controlTargetCandidates(element.id));
	let targetType = $derived(targets.find((t) => t.id === draft.targetId)?.type ?? null);
	let availableMethods = $derived(targetType ? (CONTROL_METHODS[targetType] ?? []) : []);
	let targetValueType = $derived(targetType ? (VALUE_TYPE[targetType] ?? 'text') : 'text');

	let targetVariable = $derived(doc.variables.find((v) => v.id === draft.variableId) ?? null);
	let variableValueType = $derived(
		targetVariable?.type === 'number' ? 'number' : targetVariable?.type === 'date' ? 'date' : 'text'
	);

	let canSave = $derived(
		draft.action === 'setVariable'
			? !!draft.variableId && !!draft.varMethod
			: !!draft.targetId && !!draft.method
	);

	function onTargetChange(e) {
		draft.targetId = e.currentTarget.value;
		draft.method = '';
		draft.direction = '';
	}

	function onMethodChange(e) {
		draft.method = e.currentTarget.value;
		draft.direction = draft.method === 'toggleEnabled' ? 'disable' : draft.method === 'toggleVisibility' ? 'hide' : '';
	}

	function onVariableChange(e) {
		draft.variableId = e.currentTarget.value;
		draft.varMethod = '';
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

	// A plain onkeydown on the panel (rather than <svelte:window>) so Escape
	// only closes THIS popover once nothing inside it — e.g. a value
	// field's own reference picker, or a formula popover opened from one —
	// has already swallowed the key first.
	function onKeydown(e) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bpop-backdrop" onclick={onclose}></div>

<div class="bpop-panel" onkeydown={onKeydown}>
	<div class="bpop-header">
		<span class="bpop-title">{isNew ? 'Add event' : 'Edit event'}</span>
		<button type="button" class="bpop-close" onclick={onclose}>
			<Icon name="close" size={13} />
		</button>
	</div>

	<div class="bpop-body">
		<div class="prop-field">
			<label class="prop-label" for="evt-trigger">Event</label>
			<select id="evt-trigger" class="ctrl-select" bind:value={draft.trigger}>
				<option value="click">On Click</option>
			</select>
		</div>

		<div class="prop-field">
			<label class="prop-label" for="evt-action">Action</label>
			<select id="evt-action" class="ctrl-select" bind:value={draft.action}>
				<option value="controlComponent">Control component</option>
				<option value="setVariable">Set variable</option>
			</select>
		</div>

		{#if draft.action === 'setVariable'}
			{#if doc.variables.length === 0}
				<p class="prop-hint">No variables yet — create one in the Data tab first.</p>
			{:else}
				<div class="prop-field">
					<label class="prop-label" for="evt-variable">Variable</label>
					<select id="evt-variable" class="ctrl-select" value={draft.variableId} onchange={onVariableChange}>
						<option value="">Select a variable…</option>
						{#each doc.variables as v (v.id)}
							<option value={v.id}>{v.name}</option>
						{/each}
					</select>
				</div>

				{#if draft.variableId}
					<div class="prop-field">
						<label class="prop-label" for="evt-var-method">Method</label>
						<select id="evt-var-method" class="ctrl-select" bind:value={draft.varMethod}>
							<option value="">Select a method…</option>
							<option value="set">Set</option>
							<option value="clear">Clear</option>
							<option value="resetToDefault">Reset to default</option>
						</select>
					</div>

					{#if draft.varMethod === 'set'}
						<div class="prop-field">
							<span class="prop-label">Value</span>
							{#if targetVariable?.type === 'boolean'}
								<Segmented
									options={[
										{ value: 'true', label: 'True' },
										{ value: 'false', label: 'False' }
									]}
									value={draft.props.value || 'false'}
									onchange={(v) => (draft.props.value = v)}
								/>
							{:else}
								<ExpressionField
									element={draft}
									fieldKey="value"
									fieldType={variableValueType}
									placeholder="Value to set"
								/>
							{/if}
						</div>
					{/if}
				{/if}
			{/if}
		{:else}
			<div class="prop-field">
				<label class="prop-label" for="evt-target">Component</label>
				<select id="evt-target" class="ctrl-select" value={draft.targetId} onchange={onTargetChange}>
					<option value="">Select a component…</option>
					{#each targets as t (t.id)}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
			</div>

			{#if draft.targetId}
				<div class="prop-field">
					<label class="prop-label" for="evt-method">Method</label>
					<select id="evt-method" class="ctrl-select" value={draft.method} onchange={onMethodChange}>
						<option value="">Select a method…</option>
						{#each availableMethods as m (m)}
							<option value={m}>{METHOD_LABELS[m]}</option>
						{/each}
					</select>
				</div>

				{#if draft.method === 'toggleEnabled'}
					<div class="prop-field">
						<span class="prop-label">Then</span>
						<Segmented
							options={[
								{ value: 'disable', label: 'Disable' },
								{ value: 'enable', label: 'Enable' }
							]}
							value={draft.direction || 'disable'}
							onchange={(v) => (draft.direction = v)}
						/>
					</div>
				{:else if draft.method === 'toggleVisibility'}
					<div class="prop-field">
						<span class="prop-label">Then</span>
						<Segmented
							options={[
								{ value: 'hide', label: 'Hide' },
								{ value: 'show', label: 'Show' }
							]}
							value={draft.direction || 'hide'}
							onchange={(v) => (draft.direction = v)}
						/>
					</div>
				{:else if draft.method === 'setValue' && targetType === 'labelSelector'}
					<div class="prop-field">
						<label class="prop-label" for="evt-label-value">Value</label>
						<select id="evt-label-value" class="ctrl-select" bind:value={draft.props.value}>
							<option value="">Select a label…</option>
							{#each doc.labels as id (id)}
								{@const lbl = getLabelById(id)}
								{#if lbl}
									<option value={id}>{lbl.name}</option>
								{/if}
							{/each}
						</select>
					</div>
				{:else if draft.method === 'setValue'}
					<div class="prop-field">
						<span class="prop-label">Value</span>
						<ExpressionField element={draft} fieldKey="value" fieldType={targetValueType} placeholder="Value to set" />
					</div>
				{/if}
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
	/* Label-left, field-right rows, scoped to this popover only — the rest of
	   the app keeps .prop-field's usual stacked layout. */
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
	.bpop-body :global(.prop-field > .ctrl-select),
	.bpop-body :global(.prop-field > .ctrl-text),
	.bpop-body :global(.prop-field > .ef-field),
	.bpop-body :global(.prop-field > .segmented) {
		flex: 1;
		min-width: 0;
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
