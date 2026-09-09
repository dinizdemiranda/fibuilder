<script>
	import { sourceCandidates } from '../bindings.js';
	import { blockDefs } from '../types.js';
	import Icon from '../Icon.svelte';

	let { element, fieldKey, fieldType, placeholder = '', multiline = false } = $props();

	let binding = $derived(element.bindings?.[fieldKey]);
	let hasExpression = $derived(binding?.kind === 'expression');
	let parts = $derived(hasExpression ? binding.parts : [{ type: 'literal', value: element.props?.[fieldKey] ?? '' }]);

	let pickerOpen = $state(false);
	let candidates = $derived(sourceCandidates(element.id, fieldType));
	let componentCandidates = $derived(candidates.filter((c) => c.type !== 'variable' && c.type !== 'method'));
	let variableCandidates = $derived(candidates.filter((c) => c.type === 'variable'));
	let methodCandidates = $derived(candidates.filter((c) => c.type === 'method'));
	let fieldEl = $state(null);

	function ensureExpression() {
		if (!element.bindings) element.bindings = {};
		if (element.bindings[fieldKey]?.kind !== 'expression') {
			const current = element.props?.[fieldKey] ?? '';
			element.bindings[fieldKey] = { kind: 'expression', parts: current ? [{ type: 'literal', value: current }] : [] };
		}
		return element.bindings[fieldKey];
	}

	function insertChip(src) {
		const b = ensureExpression();
		b.parts.push({ type: 'ref', sourceId: src.id });
		b.parts.push({ type: 'literal', value: '' });
		pickerOpen = false;
	}

	function updateLiteral(i, value) {
		if (hasExpression) {
			binding.parts[i].value = value;
		} else {
			if (!element.props) element.props = {};
			element.props[fieldKey] = value;
		}
	}

	function removeChip(i) {
		const b = element.bindings[fieldKey];
		b.parts.splice(i, 1);
		if (!b.parts.some((p) => p.type === 'ref')) {
			const merged = b.parts.map((p) => p.value ?? '').join('');
			delete element.bindings[fieldKey];
			element.props[fieldKey] = merged;
		}
	}

	function onLiteralKeydown(e, i) {
		if (e.key === 'Backspace' && e.currentTarget.value === '' && i > 0 && parts[i - 1].type === 'ref') {
			e.preventDefault();
			removeChip(i - 1);
		}
		if (e.key === 'Escape') pickerOpen = false;
	}

	function onLastLiteralInput(e, i) {
		updateLiteral(i, e.currentTarget.value);
		pickerOpen = false;
	}

	// Clicking blank space inside the field (not a chip or an existing input)
	// focuses the trailing segment, which opens the picker via its own focus.
	function onFieldClick(e) {
		if (e.target === fieldEl) {
			fieldEl.querySelector('.ef-literal:last-of-type')?.focus();
		}
	}

	// Width needs to fit whatever's actually visible: the typed value, or —
	// for the lone empty input — the placeholder that shows in its place.
	// Without accounting for the placeholder, an empty field collapsed to
	// ~1 character wide, truncating "Enter a default…" down to "E".
	function widthCh(value, placeholderText = '') {
		const text = value || placeholderText;
		return Math.max(4, text.length + 1);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ef-field" class:multiline bind:this={fieldEl} onclick={onFieldClick}>
	{#each parts as part, i (i)}
		{#if part.type === 'ref'}
			{@const src = candidates.find((c) => c.id === part.sourceId) ?? null}
			<span class="ef-chip" class:ef-chip-variable={src?.type === 'variable'} class:ef-chip-method={src?.type === 'method'}>
				{#if src}<Icon
						name={src.type === 'variable' ? 'variable' : src.type === 'method' ? 'clock' : (blockDefs[src.type]?.icon ?? 'text')}
						size={11}
					/>{/if}
				{src?.name ?? 'Deleted field'}
				<button type="button" data-tooltip="Remove" onclick={() => removeChip(i)}>×</button>
			</span>
		{:else if i === parts.length - 1}
			<input
				class="ef-literal"
				type="text"
				style="width: {widthCh(part.value, parts.length === 1 ? placeholder : '')}ch"
				placeholder={parts.length === 1 ? placeholder : ''}
				value={part.value}
				onfocus={() => (pickerOpen = true)}
				oninput={(e) => onLastLiteralInput(e, i)}
				onkeydown={(e) => onLiteralKeydown(e, i)}
			/>
		{:else}
			<input
				class="ef-literal"
				type="text"
				style="width: {widthCh(part.value)}ch"
				value={part.value}
				oninput={(e) => updateLiteral(i, e.currentTarget.value)}
				onkeydown={(e) => onLiteralKeydown(e, i)}
			/>
		{/if}
	{/each}

	{#if pickerOpen}
		<div class="ef-backdrop" onclick={() => (pickerOpen = false)}></div>
		<div class="ef-menu">
			{#if candidates.length === 0}
				<div class="ef-menu-empty">No other fields to insert yet.</div>
			{:else}
				{#if componentCandidates.length}
					<div class="ef-menu-heading">Components</div>
					{#each componentCandidates as src (src.id)}
						<button type="button" onclick={() => insertChip(src)}>
							<Icon name={blockDefs[src.type]?.icon ?? 'text'} size={13} />
							{src.name}
						</button>
					{/each}
				{/if}
				{#if variableCandidates.length}
					<div class="ef-menu-heading">Variables</div>
					{#each variableCandidates as src (src.id)}
						<button type="button" onclick={() => insertChip(src)}>
							<Icon name="variable" size={13} />
							{src.name}
						</button>
					{/each}
				{/if}
				{#if methodCandidates.length}
					<div class="ef-menu-heading">Methods</div>
					{#each methodCandidates as src (src.id)}
						<button type="button" onclick={() => insertChip(src)}>
							<Icon name="clock" size={13} />
							{src.name}
						</button>
					{/each}
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.ef-field {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		width: 100%;
		min-height: 34px;
		padding: 5px 6px;
		border: 1px solid #d3d6db;
		border-radius: 6px;
		background: #fff;
		box-sizing: border-box;
		cursor: text;
	}
	.ef-field:focus-within {
		border-color: #0b57d0;
	}
	.ef-field.multiline {
		min-height: 72px;
		align-content: flex-start;
	}
	.ef-literal {
		flex-shrink: 0;
		max-width: 100%;
		min-width: 6px;
		border: none;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: 13px;
		color: #1a1c1e;
		padding: 2px 1px;
	}
	.ef-chip {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #e6f4ea;
		color: #1a7d3d;
		border: 1px solid #b7e2c4;
		border-radius: 5px;
		padding: 2px 3px 2px 7px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	.ef-chip.ef-chip-variable {
		background: #f4edfc;
		color: #6b3fa0;
		border-color: #d9c7f5;
	}
	.ef-chip.ef-chip-variable button {
		color: #6b3fa0;
	}
	.ef-chip.ef-chip-method {
		background: #fef3e2;
		color: #9a5b00;
		border-color: #f5d9a8;
	}
	.ef-chip.ef-chip-method button {
		color: #9a5b00;
	}
	.ef-chip button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: none;
		background: none;
		color: #1a7d3d;
		cursor: pointer;
		border-radius: 3px;
		font-size: 13px;
		line-height: 1;
		padding: 0;
	}
	.ef-chip button:hover {
		background: rgba(0, 0, 0, 0.08);
	}
	.ef-backdrop {
		position: fixed;
		inset: 0;
		z-index: 19;
	}
	.ef-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		min-width: 190px;
		max-height: 220px;
		overflow-y: auto;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
		z-index: 20;
		padding: 4px;
	}
	.ef-menu-heading {
		padding: 6px 8px 2px;
		font-family: system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8a8f98;
	}
	.ef-menu button {
		display: flex;
		align-items: center;
		gap: 7px;
		width: 100%;
		text-align: left;
		padding: 7px 8px;
		border: none;
		background: none;
		border-radius: 5px;
		font-family: system-ui, sans-serif;
		font-size: 12px;
		color: #1a1c1e;
		cursor: pointer;
	}
	.ef-menu button:hover {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.ef-menu-empty {
		padding: 8px;
		font-family: system-ui, sans-serif;
		font-size: 12px;
		color: #8a8f98;
	}
</style>
