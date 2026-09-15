<script>
	import { setPreviewOverride } from '../state.svelte.js';
	import { effectiveOptionsFor } from '../dataSources.js';

	let { element, preview = false } = $props();
	const props = $derived(element.props);
	// A button group only ever shows the first 5 choices, regardless of
	// source — matches the cap enforced in OptionsProperties.svelte for
	// manually-entered choices, and applies it to a mapped column's
	// (unbounded) distinct values too. The "All" clear button (mapped +
	// clearOption only) counts toward this same cap, since it's just
	// another button in the row — it's prepended first, so it's the one
	// spot that's never the one trimmed off.
	const BUTTON_GROUP_MAX = 5;
	let choices = $derived(effectiveOptionsFor(element));
	let clearEnabled = $derived(
		props.mode === 'buttonGroup' && (props.sourceMode ?? 'manual') === 'mapped' && props.clearOption
	);
	let buttonGroupItems = $derived.by(() => {
		const base = choices.map((opt) => ({ value: opt, label: opt, isClear: false }));
		const withClear = clearEnabled ? [{ value: '', label: props.clearLabel || 'All', isClear: true }, ...base] : base;
		return withClear.slice(0, BUTTON_GROUP_MAX);
	});

	function setValue(v) {
		if (preview) setPreviewOverride(element.id, 'defaultValue', v);
	}
</script>

<div class="fi-field">
	{#if props.mode === 'dropdown'}
		{#if props.showLabel ?? true}
			<label class="fi-label" for="fi-select-{element.id}">{props.label}</label>
		{/if}
		<select
			id="fi-select-{element.id}"
			class="fi-input fi-select"
			onchange={(e) => setValue(e.currentTarget.value)}
		>
			{#each choices as opt (opt)}
				<option selected={opt === props.defaultValue}>{opt}</option>
			{/each}
		</select>
	{:else if props.mode === 'buttonGroup'}
		{#if props.showLabel ?? true}
			<span class="fi-label">{props.label}</span>
		{/if}
		<div class="fi-btn-group" class:attached={props.attached ?? true}>
			{#each buttonGroupItems as item, i (item.isClear ? '__clear__' : item.value + i)}
				<button
					type="button"
					class="fi-btn-group-item"
					class:active={item.isClear ? !props.defaultValue : item.value === props.defaultValue}
					onclick={() => setValue(item.value)}
				>
					{item.label}
				</button>
			{/each}
		</div>
	{:else}
		{#if props.showLabel ?? true}
			<span class="fi-label">{props.label}</span>
		{/if}
		<div class="fi-choices">
			{#each choices as opt, i (opt + i)}
				<label class="fi-choice">
					{#if props.mode === 'radio'}
						<input
							type="radio"
							name="fi-radio-{element.id}"
							checked={opt === props.defaultValue}
							onchange={() => setValue(opt)}
						/>
					{:else}
						<input type="checkbox" checked={opt === props.defaultValue} onchange={() => setValue(opt)} />
					{/if}
					<span>{opt}</span>
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
	.fi-field {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-family: var(--fi-font);
		box-sizing: border-box;
	}
	.fi-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--fi-on-surface-variant);
	}
	.fi-input {
		font-family: inherit;
		font-size: 14px;
		color: var(--fi-on-surface);
		padding: 10px 12px;
		border-radius: var(--fi-radius);
		border: 1px solid var(--fi-outline);
		background: var(--fi-surface);
		outline: none;
		width: 100%;
		box-sizing: border-box;
	}
	.fi-choices {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.fi-choice {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--fi-on-surface);
	}
	.fi-choice input {
		accent-color: var(--fi-primary);
		width: 16px;
		height: 16px;
	}
	.fi-btn-group {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.fi-btn-group-item {
		font-family: inherit;
		font-weight: 500;
		font-size: 14px;
		/* Display-only — capitalizes each word without touching the
		   underlying choice value, so a mapped column's raw values (e.g.
		   "bread") still match defaultValue/setValue exactly as stored. */
		text-transform: capitalize;
		padding: 9px 16px;
		border-radius: var(--fi-radius);
		border: 1.5px solid var(--fi-outline);
		background: var(--fi-surface);
		color: var(--fi-on-surface);
		cursor: pointer;
		box-sizing: border-box;
	}
	.fi-btn-group-item.active {
		border-color: var(--fi-primary);
		background: var(--fi-primary);
		color: #fff;
	}
	/* Attached: one continuous segmented control instead of separate pills —
	   buttons share borders (overlapped via negative margin, so there's no
	   double-thick seam) and only the outer two corners round off. Kept to a
	   single row (no wrap) and evenly split via flex:1, matching the usual
	   segmented-control look. */
	.fi-btn-group.attached {
		gap: 0;
		flex-wrap: nowrap;
	}
	.fi-btn-group.attached .fi-btn-group-item {
		flex: 1;
		min-width: 0;
		border-radius: 0;
		margin-left: -1.5px;
	}
	.fi-btn-group.attached .fi-btn-group-item:first-child {
		margin-left: 0;
		border-top-left-radius: var(--fi-radius);
		border-bottom-left-radius: var(--fi-radius);
	}
	.fi-btn-group.attached .fi-btn-group-item:last-child {
		border-top-right-radius: var(--fi-radius);
		border-bottom-right-radius: var(--fi-radius);
	}
	/* Wins the shared-border overlap so an active button's own colored edge
	   never gets visually clipped by its neighbor's overlapping border. */
	.fi-btn-group.attached .fi-btn-group-item.active {
		position: relative;
		z-index: 1;
	}
</style>
