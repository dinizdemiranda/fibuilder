<script>
	import PropSection from './PropSection.svelte';
	import Segmented from './Segmented.svelte';
	import { doc } from '../state.svelte.js';

	let { element } = $props();
</script>

<PropSection title="Content">
	<p class="prop-hint">
		Lists every label imported in the Labels tab ({doc.labels.length} available). Selection happens by clicking a
		thumbnail on the canvas — only one can be selected at a time.
	</p>
	<div class="prop-field">
		<span class="prop-label">Layout</span>
		<Segmented
			options={[
				{ value: 'grid', label: 'Grid' },
				{ value: 'list', label: 'List' }
			]}
			value={element.props.layout ?? 'grid'}
			onchange={(v) => (element.props.layout = v)}
		/>
	</div>
	<p class="prop-hint">Grid wraps thumbnail cards left to right. List stacks them, thumbnail on the left.</p>
</PropSection>
