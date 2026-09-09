<script>
	import Icon from './Icon.svelte';
	import { operatorsFor, operatorNeedsValue } from './bindings.js';
	import {
		TRANSFORM_TYPES,
		CURRENCIES,
		NODE_WIDTH,
		transformTypeLabel,
		edgeInto,
		transformInEndpoint,
		sampleValueForEndpoint,
		applyTransform,
		renameTransform
	} from './workflow.js';

	let { transform, onHeaderMouseDown, onOutputMouseDown, onRemove } = $props();

	let def = $derived(TRANSFORM_TYPES.find((t) => t.value === transform.type));
	let isDate = $derived(transform.valueType === 'date');

	// Operators offered by "If" are type-aware — reuses the same operator
	// sets a binding condition uses, keyed off this transform's own resolved
	// value type (a fabricated variable-shaped source, since operatorsFor
	// expects something valueTypeOf can read).
	let ifOperators = $derived(operatorsFor({ type: 'variable', varType: transform.valueType }));

	let editingName = $state(false);
	// svelte-ignore state_referenced_locally -- seeds the draft once; startEditName/commitName resync it on each edit
	let nameDraft = $state(transform.name);
	let nameInputEl = $state(null);

	$effect(() => {
		if (editingName && nameInputEl) {
			nameInputEl.focus();
			nameInputEl.select();
		}
	});

	function startEditName(e) {
		e.stopPropagation();
		nameDraft = transform.name;
		editingName = true;
	}
	function commitName() {
		renameTransform(transform.id, nameDraft);
		editingName = false;
	}
	function cancelName() {
		nameDraft = transform.name;
		editingName = false;
	}

	// The sample window: walks the live graph back to a real source (or
	// another transform's own sample) and runs this node's own transform on
	// it, so the node always shows a concrete in -> out example.
	let inputEdge = $derived(edgeInto(transformInEndpoint(transform.id)));
	let sampleIn = $derived(inputEdge ? sampleValueForEndpoint(inputEdge.from) : null);
	let sampleOut = $derived(sampleIn !== null ? applyTransform(transform.type, transform.settings, sampleIn, transform.valueType) : null);

	const OFFSET_UNITS = [
		{ value: 'second', label: 'Second' },
		{ value: 'minute', label: 'Minute' },
		{ value: 'hour', label: 'Hour' },
		{ value: 'day', label: 'Day' },
		{ value: 'week', label: 'Week' },
		{ value: 'month', label: 'Month' },
		{ value: 'year', label: 'Year' }
	];
	const DATE_FORMATS = [
		{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
		{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
		{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
		{ value: 'MMM D, YYYY', label: 'Jan 5, 2026' },
		{ value: 'D MMM YYYY', label: '5 Jan 2026' },
		{ value: 'MMMM D, YYYY', label: 'January 5, 2026' }
	];
	const TEXT_MODES = [
		{ value: 'uppercase', label: 'UPPERCASE' },
		{ value: 'lowercase', label: 'lowercase' },
		{ value: 'capitalize', label: 'Capitalize Each Word' },
		{ value: 'sentence', label: 'Sentence case' }
	];
</script>

<div
	class="wf-tnode"
	style="left: {transform.x}px; top: {transform.y}px; width: {NODE_WIDTH}px; --tcolor: {def?.color ?? '#8a8f98'};"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="wf-tnode-header" onmousedown={onHeaderMouseDown}>
		<Icon name={def?.icon ?? 'bolt'} size={13} />
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
				{transform.name}
			</button>
		{/if}
		<button type="button" class="wf-tnode-remove" data-tooltip="Remove" onmousedown={(e) => e.stopPropagation()} onclick={() => onRemove(transform.id)}>
			<Icon name="close" size={11} />
		</button>
	</div>

	<div class="wf-tnode-sample">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="wf-socket wf-socket-in" data-tooltip="Input" data-wf-input data-wf-input-kind="transformIn" data-transform-id={transform.id}></div>
		{#if sampleIn === null}
			<span class="wf-tnode-sample-empty">Not connected</span>
		{:else}
			<span class="wf-tnode-sample-value" data-tooltip={String(sampleIn)}>{String(sampleIn)}</span>
			<Icon name="chevron" size={11} />
			<span class="wf-tnode-sample-value wf-tnode-sample-out" data-tooltip={String(sampleOut)}>{String(sampleOut)}</span>
		{/if}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="wf-socket wf-socket-out" data-tooltip="Drag to connect" onmousedown={(e) => onOutputMouseDown(e)}></div>
	</div>

	<div class="wf-tnode-body">
		{#if transform.type === 'offset'}
			<div class="prop-field">
				<span class="prop-label">Amount</span>
				<input class="ctrl-text" type="number" bind:value={transform.settings.amount} />
			</div>
			{#if isDate}
				<div class="prop-field">
					<span class="prop-label">Unit</span>
					<select class="ctrl-select" bind:value={transform.settings.unit}>
						{#each OFFSET_UNITS as u (u.value)}
							<option value={u.value}>{u.label}</option>
						{/each}
					</select>
				</div>
			{/if}
		{:else if transform.type === 'format'}
			{#if isDate}
				<div class="prop-field">
					<span class="prop-label">Format</span>
					<select class="ctrl-select" bind:value={transform.settings.datePreset}>
						{#each DATE_FORMATS as f (f.value)}
							<option value={f.value}>{f.label}</option>
						{/each}
					</select>
				</div>
			{:else}
				<div class="prop-field">
					<span class="prop-label">Mode</span>
					<select class="ctrl-select" bind:value={transform.settings.mode}>
						<option value="regular">Regular</option>
						<option value="currency">Currency</option>
						<option value="percentage">Percentage</option>
					</select>
				</div>
				{#if transform.settings.mode === 'currency'}
					<div class="prop-field">
						<span class="prop-label">Currency</span>
						<select class="ctrl-select" bind:value={transform.settings.currency}>
							{#each CURRENCIES as c (c.value)}
								<option value={c.value}>{c.label}</option>
							{/each}
						</select>
					</div>
				{:else if transform.settings.mode === 'percentage'}
					<div class="prop-field">
						<span class="prop-label">Input scale</span>
						<select class="ctrl-select" bind:value={transform.settings.percentScale}>
							<option value="fraction">0–1 → 0–100%</option>
							<option value="whole">0–100 → 0–100%</option>
						</select>
					</div>
				{:else}
					<div class="prop-field">
						<span class="prop-label">Decimals</span>
						<input class="ctrl-text" type="number" min="0" max="6" bind:value={transform.settings.decimals} />
					</div>
				{/if}
			{/if}
		{:else if transform.type === 'textTransform'}
			<div class="prop-field">
				<span class="prop-label">Mode</span>
				<select class="ctrl-select" bind:value={transform.settings.mode}>
					{#each TEXT_MODES as m (m.value)}
						<option value={m.value}>{m.label}</option>
					{/each}
				</select>
			</div>
		{:else if transform.type === 'trim'}
			<div class="prop-field">
				<span class="prop-label">Left</span>
				<input class="ctrl-text" type="number" min="0" bind:value={transform.settings.left} />
			</div>
			<div class="prop-field">
				<span class="prop-label">Right</span>
				<input class="ctrl-text" type="number" min="0" bind:value={transform.settings.right} />
			</div>
			<div class="prop-field">
				<label class="ctrl-checkbox-row">
					<input type="checkbox" bind:checked={transform.settings.trimWhitespace} />
					Trim whitespace
				</label>
			</div>
		{:else if transform.type === 'keep'}
			<div class="prop-field">
				<span class="prop-label">Left</span>
				<input class="ctrl-text" type="number" min="0" bind:value={transform.settings.left} />
			</div>
			<div class="prop-field">
				<span class="prop-label">Right</span>
				<input class="ctrl-text" type="number" min="0" bind:value={transform.settings.right} />
			</div>
		{:else if transform.type === 'if'}
			<div class="prop-field">
				<span class="prop-label">Value</span>
				<select class="ctrl-select" bind:value={transform.settings.operator}>
					{#each ifOperators as o (o.value)}
						<option value={o.value}>{o.label}</option>
					{/each}
				</select>
			</div>
			{#if operatorNeedsValue(transform.settings.operator)}
				<div class="prop-field">
					<span class="prop-label">Compare to</span>
					<input class="ctrl-text" type="text" bind:value={transform.settings.compareValue} />
				</div>
			{/if}
			<div class="prop-field">
				<span class="prop-label">Then</span>
				<input class="ctrl-text" type="text" bind:value={transform.settings.thenValue} />
			</div>
			<div class="prop-field">
				<span class="prop-label">Else</span>
				<input class="ctrl-text" type="text" bind:value={transform.settings.elseValue} />
			</div>
		{:else if transform.type === 'replace'}
			<div class="prop-field">
				<span class="prop-label">Find</span>
				<input class="ctrl-text" type="text" bind:value={transform.settings.find} />
			</div>
			<div class="prop-field">
				<span class="prop-label">Replace with</span>
				<input class="ctrl-text" type="text" bind:value={transform.settings.replaceWith} />
			</div>
			<div class="prop-field">
				<span class="prop-label">Scope</span>
				<select class="ctrl-select" bind:value={transform.settings.scope}>
					<option value="first">First occurrence</option>
					<option value="all">All occurrences</option>
				</select>
			</div>
		{/if}
	</div>
</div>

<style>
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
		border-bottom: 1px solid color-mix(in srgb, var(--tcolor) 20%, #fff);
		font-size: 11px;
		font-family: 'SFMono-Regular', Consolas, monospace;
	}
	.wf-tnode-sample-empty {
		color: #8a8f98;
		font-style: italic;
		font-family: system-ui, sans-serif;
	}
	.wf-tnode-sample-value {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #5a5f68;
	}
	.wf-tnode-sample-out {
		color: color-mix(in srgb, var(--tcolor) 80%, #000);
		font-weight: 600;
	}
	.wf-tnode-body {
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.wf-tnode-body :global(.prop-field) {
		flex-direction: row;
		align-items: center;
		margin-bottom: 0;
		padding: 4px 0;
		gap: 8px;
	}
	.wf-tnode-body :global(.prop-label) {
		flex-shrink: 0;
		width: 74px;
		font-size: 11px;
	}
	.wf-tnode-body :global(.ctrl-select),
	.wf-tnode-body :global(.ctrl-text) {
		flex: 1;
		min-width: 0;
		font-size: 11px;
		padding: 5px 6px;
	}
	.wf-tnode-body :global(.ctrl-checkbox-row) {
		font-size: 11.5px;
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
	.wf-socket-in {
		left: -6px;
	}
	.wf-socket-out {
		right: -6px;
	}
</style>
