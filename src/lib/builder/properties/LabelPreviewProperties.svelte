<script>
	import PropSection from './PropSection.svelte';
	import Segmented from './Segmented.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<p class="prop-hint">
		Shows a live reconstruction of whatever label a Label Selector module on the page has selected — or the first
		imported label if there's no selector on the page.
	</p>
</PropSection>

<PropSection title="Layout">
	<div class="prop-field">
		<span class="prop-label">Height</span>
		<Segmented
			options={[
				{ value: true, label: 'Fill' },
				{ value: false, label: 'Fixed' }
			]}
			value={element.props.fillHeight}
			onchange={(v) => (element.props.fillHeight = v)}
		/>
	</div>
	{#if !element.props.fillHeight}
		<div class="prop-field">
			<label class="prop-label" for="lp-fixed-height">Height (px)</label>
			<input id="lp-fixed-height" class="ctrl-text" type="number" min="0" bind:value={element.props.fixedHeight} />
		</div>
	{:else}
		<p class="prop-hint">
			Fill stretches the preview to take up all the vertical space available in its column — the section or page
			it sits in must have room to give.
		</p>
	{/if}
</PropSection>
