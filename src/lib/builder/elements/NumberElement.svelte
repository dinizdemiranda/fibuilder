<script>
	import { setPreviewOverride } from '../state.svelte.js';

	let { element, preview = false } = $props();
	const props = $derived(element.props);
	// Clamped defensively (not just relying on the properties panel's own
	// min/max on its slider) in case an out-of-range value ever ends up on
	// the prop some other way.
	const COUNTER_WIDTH_MIN = 48;
	const COUNTER_WIDTH_MAX = 96;
	let counterWidth = $derived(
		Math.min(COUNTER_WIDTH_MAX, Math.max(COUNTER_WIDTH_MIN, Number(props.counterWidth) || COUNTER_WIDTH_MIN))
	);
	let sliderValue = $derived(
		props.defaultValue !== '' && props.defaultValue != null
			? Number(props.defaultValue)
			: ((Number(props.min) || 0) + (Number(props.max) || 0)) / 2
	);

	function onInput(e) {
		if (preview) setPreviewOverride(element.id, 'defaultValue', e.currentTarget.value);
	}

	// The -/+ buttons' own step (unlike direct typing/sliding, there's no
	// raw input to read a value from — the step has to move the CURRENT
	// value by a fixed amount), clamped to min/max and rounded the same way
	// the plain input's own step attribute already is.
	function changeBy(delta) {
		const current = props.defaultValue !== '' && props.defaultValue != null ? Number(props.defaultValue) : 0;
		const min = props.min !== '' && props.min != null ? Number(props.min) : -Infinity;
		const max = props.max !== '' && props.max != null ? Number(props.max) : Infinity;
		const next = Math.min(max, Math.max(min, current + delta));
		const value = props.decimals ? next : Math.round(next);
		if (preview) setPreviewOverride(element.id, 'defaultValue', String(value));
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
	{:else if props.mode === 'counter'}
		<div class="fi-counter-row">
			<button
				type="button"
				class="fi-counter-btn fi-counter-btn--{props.variant ?? 'primary'}"
				onclick={() => changeBy(-(Number(props.step) || 1))}
			>
				−
			</button>
			<input
				id="fi-number-{element.id}"
				class="fi-input fi-counter-input"
				type="number"
				style="width: {counterWidth}px"
				min={props.min}
				max={props.max}
				step={props.decimals ? props.step : Math.max(1, Math.round(props.step))}
				value={props.defaultValue ?? ''}
				oninput={onInput}
			/>
			<button
				type="button"
				class="fi-counter-btn fi-counter-btn--{props.variant ?? 'primary'}"
				onclick={() => changeBy(Number(props.step) || 1)}
			>
				+
			</button>
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
	.fi-counter-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.fi-counter-input {
		/* width comes from the inline style (counterWidth, 48-96px) */
		flex: none;
		text-align: center;
		padding: 10px 4px;
	}
	/* Same primary/secondary/text treatment as ButtonElement.svelte's
	   .fi-btn, sized to sit compactly beside the number input instead of
	   using Button's own small/normal/large scale. */
	.fi-counter-btn {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		font-family: var(--fi-font);
		font-size: 18px;
		line-height: 1;
		border-radius: var(--fi-radius);
		cursor: pointer;
		box-sizing: border-box;
	}
	.fi-counter-btn--primary {
		border: none;
		background: var(--fi-primary);
		color: #fff;
	}
	.fi-counter-btn--secondary {
		border: 1.5px solid var(--fi-primary);
		background: transparent;
		color: var(--fi-primary);
	}
	.fi-counter-btn--text {
		border: none;
		background: none;
		color: var(--fi-primary);
	}
</style>
