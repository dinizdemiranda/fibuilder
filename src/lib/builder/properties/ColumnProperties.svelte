<script>
	import { doc } from '../state.svelte.js';
	import PropSection from './PropSection.svelte';
	import Segmented from './Segmented.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import './panel.css';

	let { side } = $props();

	let list = $derived(side === 'a' ? doc.elements : doc.elementsB);
	let widthModeKey = $derived(side === 'a' ? 'colAWidthMode' : 'colBWidthMode');
	let col = $derived(side === 'a' ? doc.page.colA : doc.page.colB);
</script>

<PropSection title="Column {side === 'a' ? 'A' : 'B'}">
	<p class="prop-hint">
		{list.length} element{list.length === 1 ? '' : 's'} in this column.
		{#if doc.page.columns === 2}
			Removing it moves its elements into the other column.
		{:else}
			Hover or select either edge of the page to add a second column.
		{/if}
	</p>
	{#if doc.page.columns === 2}
		<div class="prop-field">
			<span class="prop-label">Width</span>
			<Segmented
				options={[
					{ value: 'fill', label: 'Fill' },
					{ value: 'auto', label: 'Auto' }
				]}
				value={doc.page[widthModeKey]}
				onchange={(v) => (doc.page[widthModeKey] = v)}
			/>
		</div>
		{#if doc.page[widthModeKey] === 'auto'}
			<p class="prop-hint">
				Shrinks to fit this column's own content, never narrower than 1/6 of the page. The other column fills
				whatever's left.
			</p>
		{/if}
	{/if}
</PropSection>

<PropSection title="Background">
	<div class="prop-field">
		<label class="prop-label" for="col-bg">Background</label>
		<div class="ctrl-row">
			<input
				id="col-bg"
				class="ctrl-color"
				type="color"
				value={col.props.background || '#ffffff'}
				oninput={(e) => (col.props.background = e.currentTarget.value)}
			/>
			<input class="ctrl-text" type="text" bind:value={col.props.background} placeholder="Same as page" />
		</div>
	</div>
</PropSection>

<VisibilityFields element={col} />
