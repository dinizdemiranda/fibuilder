<script>
	import PropSection from './PropSection.svelte';
	import VisualPicker from './VisualPicker.svelte';
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
				{ value: 'slider', label: 'Slider', icon: 'slider' }
			]}
			value={element.props.mode}
			onchange={(v) => (element.props.mode = v)}
		/>
	</div>
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
