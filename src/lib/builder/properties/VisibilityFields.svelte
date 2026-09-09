<script>
	import PropSection from './PropSection.svelte';
	import DynamicValueField from './DynamicValueField.svelte';

	let { element } = $props();
</script>

<PropSection title="Appearance" defaultOpen={false}>
	<DynamicValueField {element} fieldKey="hidden" label="Hidden" placeholder="false" />
	<DynamicValueField {element} fieldKey="disabled" label="Disabled" placeholder="false" />
	<p class="prop-hint">Enter "true" or "false", or click the bolt to set a condition.</p>
</PropSection>
