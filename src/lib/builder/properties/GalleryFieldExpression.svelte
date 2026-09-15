<script>
	import Icon from '../Icon.svelte';
	import { doc } from '../state.svelte.js';
	import { textPixelWidth } from '../textMeasure.js';

	// `fieldConfig` is the live { enabled, parts } record itself (part of
	// doc), mutated in place — same direct-mutation style as
	// ExpressionField.svelte's binding.parts.
	let { fieldConfig, columns = [], placeholder = '' } = $props();

	let parts = $derived(fieldConfig.parts.length ? fieldConfig.parts : [{ type: 'literal', value: '' }]);
	let pickerOpen = $state(false);
	let focusedIndex = $state(null);

	function ensureParts() {
		if (!fieldConfig.parts.length) fieldConfig.parts.push({ type: 'literal', value: '' });
		return fieldConfig.parts;
	}

	function insertChip(chip) {
		const p = ensureParts();
		p.push(chip);
		p.push({ type: 'literal', value: '' });
		pickerOpen = false;
	}

	function updateLiteral(i, value) {
		ensureParts()[i].value = value;
	}

	function removeChip(i) {
		fieldConfig.parts.splice(i, 1);
	}

	function onLiteralKeydown(e, i) {
		if (e.key === 'Backspace' && e.currentTarget.value === '' && i > 0 && parts[i - 1].type !== 'literal') {
			e.preventDefault();
			removeChip(i - 1);
		}
		if (e.key === 'Escape') pickerOpen = false;
	}

	function onLastLiteralInput(e, i) {
		updateLiteral(i, e.currentTarget.value);
		pickerOpen = false;
	}

	function onLiteralFocus(i) {
		focusedIndex = i;
		pickerOpen = true;
	}

	function onLiteralBlur(i) {
		if (focusedIndex === i) focusedIndex = null;
	}

	// See ExpressionField.svelte's literalWidth for why this measures actual
	// pixel width instead of an `Nch` approximation — the same fixed-point
	// overshoot was making adjacent chips here look like they had a space
	// between them that wasn't actually in the data.
	function literalWidth(value, placeholderText = '', isFocused = false) {
		const text = value || placeholderText;
		const caretRoom = isFocused ? 4 : 0;
		return `${Math.max(2, Math.ceil(textPixelWidth(text)) + caretRoom)}px`;
	}

	function chipLabel(part) {
		if (part.type === 'column') return part.column;
		const v = doc.variables.find((x) => x.id === part.variableId);
		return v?.name ?? 'Deleted variable';
	}
</script>

<div class="gfe-field">
	{#each parts as part, i (i)}
		{#if part.type !== 'literal'}
			<span class="gfe-chip" class:gfe-chip-variable={part.type === 'variable'}>
				<Icon name={part.type === 'variable' ? 'variable' : 'database'} size={11} />
				{chipLabel(part)}
				<button type="button" data-tooltip="Remove" onclick={() => removeChip(i)}>×</button>
			</span>
		{:else if i === parts.length - 1}
			<input
				class="gfe-literal"
				type="text"
				style="width: {literalWidth(part.value, parts.length === 1 ? placeholder : '', focusedIndex === i)}"
				placeholder={parts.length === 1 ? placeholder : ''}
				value={part.value}
				onfocus={() => onLiteralFocus(i)}
				onblur={() => onLiteralBlur(i)}
				oninput={(e) => onLastLiteralInput(e, i)}
				onkeydown={(e) => onLiteralKeydown(e, i)}
			/>
		{:else}
			<input
				class="gfe-literal"
				type="text"
				style="width: {literalWidth(part.value)}"
				value={part.value}
				oninput={(e) => updateLiteral(i, e.currentTarget.value)}
				onkeydown={(e) => onLiteralKeydown(e, i)}
			/>
		{/if}
	{/each}

	{#if pickerOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="gfe-backdrop" onclick={() => (pickerOpen = false)}></div>
		<div class="gfe-menu">
			{#if columns.length === 0 && doc.variables.length === 0}
				<div class="gfe-menu-empty">No columns or variables to insert yet.</div>
			{:else}
				{#if columns.length}
					<div class="gfe-menu-heading">Columns</div>
					{#each columns as col (col)}
						<button type="button" onclick={() => insertChip({ type: 'column', column: col })}>
							<Icon name="database" size={13} />
							{col}
						</button>
					{/each}
				{/if}
				{#if doc.variables.length}
					<div class="gfe-menu-heading">Variables</div>
					{#each doc.variables as v (v.id)}
						<button type="button" onclick={() => insertChip({ type: 'variable', variableId: v.id })}>
							<Icon name="variable" size={13} />
							{v.name}
						</button>
					{/each}
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.gfe-field {
		/* No flex `gap` here on purpose — see ExpressionField.svelte's
		   identical .ef-field comment: it added a uniform gap regardless of
		   whether the literal between two chips actually held a typed
		   space, which read as a space that wasn't really there. Spacing
		   comes only from .gfe-chip's own margin plus each literal's actual
		   measured content width now. */
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		width: 100%;
		min-height: 34px;
		padding: 5px 6px;
		border: 1px solid #d3d6db;
		border-radius: 6px;
		background: #fff;
		box-sizing: border-box;
		cursor: text;
	}
	.gfe-field:focus-within {
		border-color: #0b57d0;
	}
	.gfe-literal {
		flex-shrink: 0;
		max-width: 100%;
		min-width: 2px;
		border: none;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: 13px;
		color: #1a1c1e;
		padding: 2px 0;
	}
	.gfe-chip {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin: 0 2px;
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
	.gfe-chip.gfe-chip-variable {
		background: #f4edfc;
		color: #6b3fa0;
		border-color: #d9c7f5;
	}
	.gfe-chip.gfe-chip-variable button {
		color: #6b3fa0;
	}
	.gfe-chip button {
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
	.gfe-chip button:hover {
		background: rgba(0, 0, 0, 0.08);
	}
	.gfe-backdrop {
		position: fixed;
		inset: 0;
		z-index: 19;
	}
	.gfe-menu {
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
	.gfe-menu-heading {
		padding: 6px 8px 2px;
		font-family: system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8a8f98;
	}
	.gfe-menu button {
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
	.gfe-menu button:hover {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.gfe-menu-empty {
		padding: 8px;
		font-family: system-ui, sans-serif;
		font-size: 12px;
		color: #8a8f98;
	}
</style>
