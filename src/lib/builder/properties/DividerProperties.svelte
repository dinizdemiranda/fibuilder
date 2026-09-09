<script>
	import PropSection from './PropSection.svelte';
	import VisibilityFields from './VisibilityFields.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<p class="prop-hint">A plain divider line — no additional settings.</p>
</PropSection>

<VisibilityFields {element} />
