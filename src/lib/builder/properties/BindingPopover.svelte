<script>
	import Icon from '../Icon.svelte';
	import Segmented from './Segmented.svelte';
	import { getFieldType, anySourceCandidates, operatorsFor, operatorNeedsValue, valueTypeOf } from '../bindings.js';
	import { effectiveOptionsFor } from '../dataSources.js';

	let { element, fieldKey, label, onclose } = $props();

	// svelte-ignore state_referenced_locally -- element/fieldKey are fixed for this popover's lifetime (it's remounted fresh each time it opens)
	const fieldType = getFieldType(element, fieldKey);
	const rulesKey = fieldType === 'boolean' ? 'rules' : 'matches';
	// svelte-ignore state_referenced_locally -- same as above: read once to know whether "Remove condition" should be offered
	const hadCondition = element.bindings?.[fieldKey]?.kind === 'condition';

	function freshRule() {
		return { sourceId: '', operator: 'equals', value: '' };
	}

	function cloneBinding() {
		const b = element.bindings?.[fieldKey];
		if (b?.kind !== 'condition') {
			return fieldType === 'boolean'
				? { kind: 'condition', combinator: 'AND', rules: [freshRule()] }
				: { kind: 'condition', combinator: 'AND', matches: [freshRule()], result: '', elseResult: '' };
		}
		return fieldType === 'boolean'
			? { kind: 'condition', combinator: b.combinator ?? 'AND', rules: b.rules.map((r) => ({ ...r })) }
			: {
					kind: 'condition',
					combinator: b.combinator ?? 'AND',
					matches: b.matches.map((m) => ({ ...m })),
					result: b.result ?? '',
					elseResult: b.elseResult ?? ''
				};
	}

	// The popover edits a local draft; nothing is written to element.bindings
	// until OK is clicked, so opening it (and always showing one condition
	// row) never changes what the field actually renders.
	// svelte-ignore state_referenced_locally -- seeds the draft once when this popover mounts
	let draft = $state(cloneBinding());

	let conditionSources = $derived(anySourceCandidates(element.id));
	let conditionComponents = $derived(conditionSources.filter((s) => s.type !== 'variable'));
	let conditionVariables = $derived(conditionSources.filter((s) => s.type === 'variable'));

	function sourceOf(rule) {
		return conditionSources.find((s) => s.id === rule.sourceId) ?? null;
	}

	function onSourceChange(rule, e) {
		rule.sourceId = e.currentTarget.value;
		rule.operator = 'equals';
		rule.value = '';
	}

	function addRule() {
		if (draft[rulesKey].length < 2) draft[rulesKey].push(freshRule());
	}

	function removeRule(i) {
		if (draft[rulesKey].length > 1) draft[rulesKey].splice(i, 1);
	}

	function ok() {
		if (!element.bindings) element.bindings = {};
		element.bindings[fieldKey] = draft;
		onclose();
	}

	function removeCondition() {
		if (element.bindings) delete element.bindings[fieldKey];
		onclose();
	}

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#snippet ruleRow(rule, i)}
	{@const source = sourceOf(rule)}
	<div class="bpop-rule">
		<div class="bpop-row">
			<select class="ctrl-select" value={rule.sourceId} onchange={(e) => onSourceChange(rule, e)}>
				<option value="">Select a field…</option>
				{#if conditionComponents.length}
					<optgroup label="Components">
						{#each conditionComponents as src (src.id)}
							<option value={src.id}>{src.name}</option>
						{/each}
					</optgroup>
				{/if}
				{#if conditionVariables.length}
					<optgroup label="Variables">
						{#each conditionVariables as src (src.id)}
							<option value={src.id}>{src.name}</option>
						{/each}
					</optgroup>
				{/if}
			</select>
			<button
				type="button"
				class="icon-btn"
				data-tooltip="Remove condition"
				disabled={draft[rulesKey].length <= 1}
				onclick={() => removeRule(i)}
			>
				<Icon name="trash" size={13} />
			</button>
		</div>
		<div class="bpop-row">
			<select
				class="ctrl-select"
				value={rule.operator ?? 'equals'}
				onchange={(e) => (rule.operator = e.currentTarget.value)}
			>
				{#each operatorsFor(source) as op (op.value)}
					<option value={op.value}>{op.label}</option>
				{/each}
			</select>
		</div>
		{#if operatorNeedsValue(rule.operator ?? 'equals')}
			<div class="bpop-row">
				{#if source?.type === 'options' && (rule.operator ?? 'equals') === 'equals'}
					<select class="ctrl-select" bind:value={rule.value}>
						<option value="">Select a choice…</option>
						{#each effectiveOptionsFor(source) as opt (opt)}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				{:else if valueTypeOf(source) === 'date'}
					<input class="ctrl-text" type="date" bind:value={rule.value} />
				{:else if valueTypeOf(source) === 'number'}
					<input class="ctrl-text" type="number" bind:value={rule.value} />
				{:else if valueTypeOf(source) === 'boolean'}
					<Segmented
						options={[
							{ value: 'true', label: 'True' },
							{ value: 'false', label: 'False' }
						]}
						value={rule.value || 'true'}
						onchange={(v) => (rule.value = v)}
					/>
				{:else}
					<input class="ctrl-text" type="text" placeholder="Value to match" bind:value={rule.value} />
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bpop-backdrop" onclick={onclose}></div>

<div class="bpop-panel">
	<div class="bpop-header">
		<span class="bpop-title">{label} condition</span>
		<button type="button" class="bpop-close" onclick={onclose}>
			<Icon name="close" size={13} />
		</button>
	</div>

	<div class="bpop-body">
		<div class="prop-field">
			<span class="prop-label">
				{fieldType === 'boolean' ? 'True when' : 'When'}
				{draft[rulesKey].length === 2 ? '' : 'this matches'}
			</span>
			<div class="bpop-rows">
				{@render ruleRow(draft[rulesKey][0], 0)}
				{#if draft[rulesKey][1]}
					<div class="bpop-combinator">
						<Segmented
							options={[
								{ value: 'AND', label: 'AND' },
								{ value: 'OR', label: 'OR' }
							]}
							value={draft.combinator ?? 'AND'}
							onchange={(v) => (draft.combinator = v)}
						/>
					</div>
					{@render ruleRow(draft[rulesKey][1], 1)}
				{/if}
				{#if draft[rulesKey].length < 2}
					<button type="button" class="add-btn" onclick={addRule}>+ Add condition</button>
				{/if}
			</div>
		</div>

		{#if fieldType !== 'boolean'}
			<div class="prop-field">
				<label class="prop-label" for="bpop-result">Then set to</label>
				<input
					id="bpop-result"
					class="ctrl-text"
					type={fieldType === 'date' ? 'date' : fieldType === 'number' ? 'number' : 'text'}
					bind:value={draft.result}
				/>
			</div>
			<div class="prop-field">
				<label class="prop-label" for="bpop-else">Otherwise set to</label>
				<input
					id="bpop-else"
					class="ctrl-text"
					type={fieldType === 'date' ? 'date' : fieldType === 'number' ? 'number' : 'text'}
					bind:value={draft.elseResult}
				/>
			</div>
		{/if}

		<div class="bpop-footer">
			{#if hadCondition}
				<button type="button" class="link-btn" onclick={removeCondition}>Remove condition</button>
			{:else}
				<span></span>
			{/if}
			<button type="button" class="bpop-ok" onclick={ok}>OK</button>
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
	.bpop-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.bpop-row {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.bpop-row select,
	.bpop-row input {
		flex: 1;
	}
	.bpop-rule {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px;
		border: 1px solid #e2e4e8;
		border-radius: 8px;
		background: #fafafb;
	}
	.bpop-combinator {
		align-self: center;
		width: 120px;
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
</style>
