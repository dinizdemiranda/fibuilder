<script>
	import PropSection from './PropSection.svelte';
	import VisibilityFields from './VisibilityFields.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<div class="prop-field">
		<label class="prop-label" for="img-src">Image URL</label>
		<input id="img-src" class="ctrl-text" type="text" bind:value={element.props.src} placeholder="https://…" />
	</div>
	<div class="prop-field">
		<label class="prop-label" for="img-alt">Alt text</label>
		<input id="img-alt" class="ctrl-text" type="text" bind:value={element.props.alt} />
	</div>
</PropSection>

<VisibilityFields {element} />
