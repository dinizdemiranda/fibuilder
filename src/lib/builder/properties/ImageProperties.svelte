<script>
	import PropSection from './PropSection.svelte';
	import Switch from './Switch.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import DynamicValueField from './DynamicValueField.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<DynamicValueField {element} fieldKey="src" label="Image URL" placeholder="https://…" />
	<div class="prop-field">
		<label class="prop-label" for="img-alt">Alt text</label>
		<input id="img-alt" class="ctrl-text" type="text" bind:value={element.props.alt} />
	</div>
</PropSection>

<PropSection title="Layout">
	<div class="prop-field prop-field-row">
		<span class="prop-label">Fill height</span>
		<Switch bind:checked={element.props.fillHeight} />
	</div>
	<p class="prop-hint">
		{#if element.props.fillHeight}
			Stretches to fill the column (or, placed inside a grid, the cell) it's in — the section or page it sits in
			must have room to give.
		{:else}
			A fixed 220px tall.
		{/if}
	</p>
</PropSection>

<VisibilityFields {element} />
