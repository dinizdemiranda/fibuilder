<script>
	import Segmented from './Segmented.svelte';
	import VisualPicker from './VisualPicker.svelte';
	import PropSection from './PropSection.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import DynamicValueField from './DynamicValueField.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<DynamicValueField {element} fieldKey="content" label="Value" multiline placeholder="Enter text…" />
	<div class="prop-field">
		<span class="prop-label">Style</span>
		<VisualPicker
			options={[
				{ value: 'heading1', label: 'Heading 1', icon: 'heading1' },
				{ value: 'heading2', label: 'Heading 2', icon: 'heading2' },
				{ value: 'body', label: 'Body', icon: 'bodyText' }
			]}
			value={element.props.variant}
			onchange={(v) => (element.props.variant = v)}
		/>
	</div>
	<div class="prop-field">
		<span class="prop-label">Alignment</span>
		<Segmented
			options={[
				{ value: 'left', label: 'Left' },
				{ value: 'center', label: 'Center' },
				{ value: 'right', label: 'Right' }
			]}
			value={element.props.align}
			onchange={(v) => (element.props.align = v)}
		/>
	</div>
</PropSection>

<VisibilityFields {element} />
