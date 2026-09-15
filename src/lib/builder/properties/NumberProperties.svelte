<script>
	import PropSection from './PropSection.svelte';
	import VisualPicker from './VisualPicker.svelte';
	import Segmented from './Segmented.svelte';
	import Switch from './Switch.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import DynamicValueField from './DynamicValueField.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<div class="prop-field">
		<label class="prop-label" for="num-label">Label</label>
		<input id="num-label" class="ctrl-text" type="text" bind:value={element.props.label} />
	</div>
	<div class="prop-field">
		<span class="prop-label">Input type</span>
		<VisualPicker
			options={[
				{ value: 'input', label: 'Input', icon: 'textfield' },
				{ value: 'slider', label: 'Slider', icon: 'slider' },
				{ value: 'counter', label: 'Counter', icon: 'counter' }
			]}
			value={element.props.mode}
			onchange={(v) => (element.props.mode = v)}
		/>
	</div>
	{#if element.props.mode === 'counter'}
		<div class="prop-field">
			<span class="prop-label">Button style</span>
			<Segmented
				options={[
					{ value: 'primary', label: 'Primary' },
					{ value: 'secondary', label: 'Secondary' },
					{ value: 'text', label: 'Text' }
				]}
				value={element.props.variant ?? 'primary'}
				onchange={(v) => (element.props.variant = v)}
			/>
		</div>
		<div class="prop-field">
			<span class="prop-label">Input width</span>
			<div class="num-width-row">
				<input type="range" min="48" max="96" bind:value={element.props.counterWidth} />
				<input class="ctrl-text num-width-num" type="number" min="48" max="96" bind:value={element.props.counterWidth} />
			</div>
		</div>
	{/if}
	<DynamicValueField {element} fieldKey="defaultValue" label="Default Value" placeholder="0" />
</PropSection>

<PropSection title="Range">
	<div class="prop-row">
		<div class="prop-field">
			<label class="prop-label" for="num-min">Min</label>
			<input id="num-min" class="ctrl-text" type="number" bind:value={element.props.min} />
		</div>
		<div class="prop-field">
			<label class="prop-label" for="num-max">Max</label>
			<input id="num-max" class="ctrl-text" type="number" bind:value={element.props.max} />
		</div>
	</div>
	<div class="prop-field">
		<label class="prop-label" for="num-step">Step</label>
		<input id="num-step" class="ctrl-text" type="number" min="0" bind:value={element.props.step} />
	</div>
	<div class="prop-field prop-field-row">
		<span class="prop-label">Allow decimals</span>
		<Switch bind:checked={element.props.decimals} />
	</div>
</PropSection>

<VisibilityFields {element} />

<style>
	.num-width-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.num-width-row input[type='range'] {
		flex: 1;
		min-width: 0;
	}
	.num-width-num {
		width: 48px;
		flex-shrink: 0;
		padding: 8px 6px;
		text-align: center;
	}
</style>
