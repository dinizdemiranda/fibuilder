<script>
	import Segmented from './Segmented.svelte';
	import IconSegmented from './IconSegmented.svelte';
	import PropSection from './PropSection.svelte';
	import VisibilityFields from './VisibilityFields.svelte';

	let { element } = $props();

	// Older sections created before this prop existed just default to 'left'.
	function setJustify(v) {
		element.justify = v;
	}

	const ALIGN_OPTIONS = [
		{ value: 'left', label: 'Left', icon: 'alignLeft' },
		{ value: 'center', label: 'Center', icon: 'alignCenter' },
		{ value: 'right', label: 'Right', icon: 'alignRight' }
	];
	const SPACING_OPTIONS = [
		{ value: 'around', label: 'Around', icon: 'spaceAround' },
		{ value: 'between', label: 'Between', icon: 'spaceBetween' },
		{ value: 'evenly', label: 'Evenly', icon: 'spaceEvenly' }
	];
</script>

<PropSection title="Layout">
	<div class="prop-field">
		<span class="prop-label">Direction</span>
		<Segmented
			options={[
				{ value: 'vertical', label: 'Vertical' },
				{ value: 'horizontal', label: 'Horizontal' }
			]}
			value={element.direction}
			onchange={(v) => (element.direction = v)}
		/>
	</div>
	<div class="prop-field">
		<span class="prop-label">Alignment</span>
		<div class="align-groups">
			<IconSegmented options={ALIGN_OPTIONS} value={element.justify ?? 'left'} onchange={setJustify} />
			<IconSegmented options={SPACING_OPTIONS} value={element.justify ?? 'left'} onchange={setJustify} />
		</div>
	</div>
	<div class="prop-row">
		<div class="prop-field">
			<span class="prop-label">Item width</span>
			<Segmented
				options={[
					{ value: 'auto', label: 'Auto' },
					{ value: 'fill', label: 'Fill' }
				]}
				value={element.itemSizing}
				onchange={(v) => (element.itemSizing = v)}
			/>
		</div>
		<div class="prop-field">
			<label class="prop-label" for="section-gap">Gap: {element.gap}px</label>
			<input id="section-gap" type="range" min="0" max="99" bind:value={element.gap} />
		</div>
	</div>
</PropSection>

<VisibilityFields {element} />

<style>
	.align-groups {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
