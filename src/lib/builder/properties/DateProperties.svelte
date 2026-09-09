<script>
	import PropSection from './PropSection.svelte';
	import Segmented from './Segmented.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import DynamicValueField from './DynamicValueField.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<div class="prop-field">
		<label class="prop-label" for="date-label">Label</label>
		<input id="date-label" class="ctrl-text" type="text" bind:value={element.props.label} />
	</div>
	<div class="prop-field">
		<span class="prop-label">Mode</span>
		<Segmented
			options={[
				{ value: 'date', label: 'Date' },
				{ value: 'datetime', label: 'Date & time' }
			]}
			value={element.props.mode}
			onchange={(v) => (element.props.mode = v)}
		/>
	</div>
	<DynamicValueField {element} fieldKey="defaultValue" label="Default Value" placeholder="YYYY-MM-DD" />
</PropSection>

<VisibilityFields {element} />
