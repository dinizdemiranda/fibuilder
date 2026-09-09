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

	// Older sections created before this prop existed just default to 'end'.
	function setAlign(v) {
		element.align = v;
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
	// Reuses the horizontal-alignment glyphs rotated 90° — a bar registered to
	// the left/center/right reads just as well as one registered to the
	// top/middle/bottom once turned on its side, same trick design tools use.
	const VALIGN_OPTIONS = [
		{ value: 'start', label: 'Start', icon: 'alignLeft' },
		{ value: 'center', label: 'Center', icon: 'alignCenter' },
		{ value: 'end', label: 'End', icon: 'alignRight' }
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
			<span class="prop-label">Vertical alignment</span>
			<IconSegmented options={VALIGN_OPTIONS} value={element.align ?? 'end'} onchange={setAlign} rotate={90} />
		</div>
		<div class="prop-field">
			<span class="prop-label">Gap</span>
			<div class="gap-row">
				<input type="range" min="0" max="99" bind:value={element.gap} />
				<input class="ctrl-text gap-num" type="number" min="0" max="99" bind:value={element.gap} />
			</div>
		</div>
	</div>
</PropSection>

<VisibilityFields {element} />

<style>
	/* Matches .prop-row's own math (flex:1 children, 10px gap) so the two
	   groups combined span exactly the same full width as Direction's
	   control, and each one lands exactly on the same column boundary as
	   any other two-field .prop-row (e.g. Vertical alignment/Gap below) —
	   not just naturally hugging their icons. */
	.align-groups {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.align-groups :global(.icon-segmented) {
		flex: 1;
	}
	.gap-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.gap-row input[type='range'] {
		flex: 1;
		min-width: 0;
	}
	.gap-num {
		width: 48px;
		flex-shrink: 0;
		padding: 8px 6px;
		text-align: center;
	}
</style>
