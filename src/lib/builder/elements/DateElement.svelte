<script>
	import { setPreviewOverride } from '../state.svelte.js';

	let { element, preview = false } = $props();
	const props = $derived(element.props);

	function onInput(e) {
		if (preview) setPreviewOverride(element.id, 'defaultValue', e.currentTarget.value);
	}
</script>

<div class="fi-field">
	<label class="fi-label" for="fi-date-{element.id}">{props.label}</label>
	{#if props.mode === 'datetime'}
		<input
			id="fi-date-{element.id}"
			class="fi-input"
			type="datetime-local"
			value={props.defaultValue || ''}
			oninput={onInput}
		/>
	{:else}
		<input id="fi-date-{element.id}" class="fi-input" type="date" value={props.defaultValue || ''} oninput={onInput} />
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
	.fi-input:focus {
		border-color: var(--fi-primary);
		border-width: 2px;
		padding: 9px 11px;
	}
</style>
