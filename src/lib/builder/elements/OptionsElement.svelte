<script>
	import { setPreviewOverride } from '../state.svelte.js';
	import { effectiveOptionsFor } from '../dataSources.js';

	let { element, preview = false } = $props();
	const props = $derived(element.props);
	let choices = $derived(effectiveOptionsFor(element));

	function setValue(v) {
		if (preview) setPreviewOverride(element.id, 'defaultValue', v);
	}
</script>

<div class="fi-field">
	{#if props.mode === 'dropdown'}
		<label class="fi-label" for="fi-select-{element.id}">{props.label}</label>
		<select
			id="fi-select-{element.id}"
			class="fi-input fi-select"
			onchange={(e) => setValue(e.currentTarget.value)}
		>
			{#each choices as opt (opt)}
				<option selected={opt === props.defaultValue}>{opt}</option>
			{/each}
		</select>
	{:else}
		<span class="fi-label">{props.label}</span>
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
</style>
