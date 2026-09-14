<script>
	import PropSection from './PropSection.svelte';
	import Segmented from './Segmented.svelte';
	import Switch from './Switch.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import EventsSection from './EventsSection.svelte';

	let { element } = $props();
</script>

<PropSection title="Content">
	<div class="prop-field">
		<label class="prop-label" for="btn-label">Label</label>
		<input id="btn-label" class="ctrl-text" type="text" bind:value={element.props.label} />
	</div>
	<div class="prop-field">
		<span class="prop-label">Style</span>
		<Segmented
			options={[
				{ value: 'primary', label: 'Primary' },
				{ value: 'secondary', label: 'Secondary' },
				{ value: 'text', label: 'Text' }
			]}
			value={element.props.variant ?? 'primary'}
			onchange={(v) => (element.props.variant = v)}
		/>
	</div>
	<div class="prop-field">
		<span class="prop-label">Size</span>
		<Segmented
			options={[
				{ value: 'small', label: 'Small' },
				{ value: 'normal', label: 'Normal' },
				{ value: 'large', label: 'Large' }
			]}
			value={element.props.size ?? 'normal'}
			onchange={(v) => (element.props.size = v)}
		/>
	</div>
	<div class="prop-field prop-field-row">
		<span class="prop-label">Full width</span>
		<Switch bind:checked={element.props.fullWidth} />
	</div>
</PropSection>

<EventsSection {element} />

<VisibilityFields {element} />
