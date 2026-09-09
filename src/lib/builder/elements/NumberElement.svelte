<script>
	import { setPreviewOverride } from '../state.svelte.js';

	let { element, preview = false } = $props();
	const props = $derived(element.props);
	let sliderValue = $derived(
		props.defaultValue !== '' && props.defaultValue != null
			? Number(props.defaultValue)
			: ((Number(props.min) || 0) + (Number(props.max) || 0)) / 2
	);

	function onInput(e) {
		if (preview) setPreviewOverride(element.id, 'defaultValue', e.currentTarget.value);
	}
</script>

<div class="fi-field">
	<label class="fi-label" for="fi-number-{element.id}">{props.label}</label>
	{#if props.mode === 'slider'}
		<div class="fi-slider-row">
			<input
				id="fi-number-{element.id}"
				class="fi-slider"
				type="range"
				min={props.min}
				max={props.max}
				step={props.step}
				value={sliderValue}
				oninput={onInput}
			/>
			<span class="fi-slider-value">{props.decimals ? sliderValue.toFixed(2) : Math.round(sliderValue)}</span>
		</div>
	{:else}
		<input
			id="fi-number-{element.id}"
			class="fi-input"
			type="number"
			min={props.min}
			max={props.max}
			step={props.decimals ? props.step : Math.max(1, Math.round(props.step))}
			value={props.defaultValue ?? ''}
			oninput={onInput}
		/>
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
	.fi-slider-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.fi-slider {
		flex: 1;
		accent-color: var(--fi-primary);
	}
	.fi-slider-value {
		font-size: 13px;
		color: var(--fi-on-surface);
		min-width: 32px;
		text-align: right;
	}
</style>
