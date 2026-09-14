<script>
	import PropSection from './PropSection.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import Segmented from './Segmented.svelte';
	import Switch from './Switch.svelte';
	import { FR_OPTIONS, resizeTracks, resizeGridChildren } from '../columnGrid.js';

	let { element } = $props();

	function onColumnsInput(e) {
		const newColumns = resizeTracks(element.colTracks, e.currentTarget.value);
		resizeGridChildren(element, newColumns, element.rows);
		element.columns = newColumns;
	}
	function onRowsInput(e) {
		const newRows = resizeTracks(element.rowTracks, e.currentTarget.value);
		resizeGridChildren(element, element.columns, newRows);
		element.rows = newRows;
	}
</script>

{#snippet trackRow(t, label)}
	<div class="grid-track-row">
		<span class="grid-track-label">{label}</span>
		<Segmented
			options={[
				{ value: 'fill', label: 'Fill' },
				{ value: 'auto', label: 'Auto' },
				{ value: 'fixed', label: 'Fixed' }
			]}
			value={t.mode}
			onchange={(v) => (t.mode = v)}
		/>
		{#if t.mode === 'fill'}
			<select class="ctrl-select grid-track-value" bind:value={t.fr}>
				{#each FR_OPTIONS as fr (fr)}
					<option value={fr}>{fr}fr</option>
				{/each}
			</select>
		{:else if t.mode === 'fixed'}
			<input class="ctrl-text grid-track-value" type="number" min="0" bind:value={t.px} />
		{:else}
			<input class="ctrl-text grid-track-value" type="text" value="" disabled placeholder="Auto" />
		{/if}
	</div>
{/snippet}

<PropSection title="Grid">
	<div class="prop-row">
		<div class="prop-field">
			<label class="prop-label" for="grid-columns">Columns</label>
			<input id="grid-columns" class="ctrl-text" type="number" min="1" max="12" value={element.columns} oninput={onColumnsInput} />
		</div>
		<div class="prop-field">
			<label class="prop-label" for="grid-rows">Rows</label>
			<input id="grid-rows" class="ctrl-text" type="number" min="1" max="12" value={element.rows} oninput={onRowsInput} />
		</div>
	</div>

	<div class="grid-section-title">Columns</div>
	<div class="grid-track-list">
		{#each element.colTracks as t, i (i)}
			{@render trackRow(t, `Column ${i + 1}`)}
		{/each}
	</div>

	<div class="grid-section-title">Rows</div>
	<div class="grid-track-list">
		{#each element.rowTracks as t, i (i)}
			{@render trackRow(t, `Row ${i + 1}`)}
		{/each}
	</div>

	<div class="prop-field prop-field-row">
		<span class="prop-label">Fill height</span>
		<Switch bind:checked={element.props.fillHeight} />
	</div>
	{#if element.props.fillHeight}
		<p class="prop-hint">
			Stretches to fill the column and can't scroll — if the page has 2 columns, turn on "Scroll independently" in
			Page properties so the other column can still scroll on its own.
		</p>
	{/if}
</PropSection>

<VisibilityFields {element} />

<style>
	.grid-section-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8a8f98;
		margin: 4px 0 -4px;
	}
	.grid-track-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 14px;
	}
	.grid-track-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.grid-track-label {
		flex-shrink: 0;
		width: 64px;
		font-size: 12px;
		color: #1a1c1e;
	}
	.grid-track-value {
		width: 76px;
		flex-shrink: 0;
	}
</style>
