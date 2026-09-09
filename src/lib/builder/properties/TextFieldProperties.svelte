<script>
	import PropSection from './PropSection.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import DynamicValueField from './DynamicValueField.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<div class="prop-field">
		<label class="prop-label" for="tf-label">Label</label>
		<input id="tf-label" class="ctrl-text" type="text" bind:value={element.props.label} />
	</div>
	<div class="prop-field">
		<label class="prop-label" for="tf-placeholder">Placeholder</label>
		<input id="tf-placeholder" class="ctrl-text" type="text" bind:value={element.props.placeholder} />
	</div>
	<DynamicValueField {element} fieldKey="defaultValue" label="Default Value" placeholder="Enter a default…" />
	<div class="prop-field">
		<label class="ctrl-checkbox-row">
			<input type="checkbox" bind:checked={element.props.multiline} />
			Multi-line (text area)
		</label>
	</div>
	<div class="prop-field">
		<label class="ctrl-checkbox-row">
			<input type="checkbox" bind:checked={element.props.required} />
			Required
		</label>
	</div>
	<div class="prop-row">
		<div class="prop-field">
			<label class="prop-label" for="tf-minlength">Min characters</label>
			<input id="tf-minlength" class="ctrl-text" type="number" min="0" bind:value={element.props.minLength} />
		</div>
		<div class="prop-field">
			<label class="prop-label" for="tf-maxlength">Max characters</label>
			<input id="tf-maxlength" class="ctrl-text" type="number" min="0" bind:value={element.props.maxLength} />
		</div>
	</div>
</PropSection>

<VisibilityFields {element} />
