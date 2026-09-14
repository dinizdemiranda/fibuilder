<script>
	import PropSection from './PropSection.svelte';
	import Segmented from './Segmented.svelte';
	import Switch from './Switch.svelte';
	import Icon from '../Icon.svelte';
	import FilterPopover from './FilterPopover.svelte';
	import EventsSection from './EventsSection.svelte';
	import DataLookupEventPopover from './DataLookupEventPopover.svelte';
	import GalleryFieldExpression from './GalleryFieldExpression.svelte';
	import { getDataSourceById } from '../dataSources.js';
	import { availableDataSources } from '../projects.js';
	import { describeFilter } from '../dataLookup.js';
	import { describeSelectEvent } from '../events.js';
	import { GALLERY_CARD_LAYOUTS, GALLERY_FIELD_DEFS, GALLERY_SAMPLE_VALUES } from '../galleryFields.js';

	function fieldPlaceholder(key) {
		return GALLERY_FIELD_DEFS[key].kind === 'image' ? 'Image URL' : `E.g. ${GALLERY_SAMPLE_VALUES[key]}`;
	}

	let { element } = $props();

	let source = $derived(getDataSourceById(element.props.dataSourceId));
	let openFilterIndex = $state(null);

	let dragIndex = $state(null);
	let overIndex = $state(null);

	function onSourceChange(e) {
		element.props.dataSourceId = e.currentTarget.value || null;
		element.props.filters = [];
	}

	function removeFilter(i) {
		element.props.filters.splice(i, 1);
	}

	function onFieldDragStart(i) {
		dragIndex = i;
	}
	function onFieldDragOver(e, i) {
		e.preventDefault();
		overIndex = i;
	}
	function onFieldDrop(i) {
		if (dragIndex === null || dragIndex === i) {
			dragIndex = null;
			overIndex = null;
			return;
		}
		const fields = element.props.fields;
		const [moved] = fields.splice(dragIndex, 1);
		fields.splice(i, 0, moved);
		dragIndex = null;
		overIndex = null;
	}
	function onFieldDragEnd() {
		dragIndex = null;
		overIndex = null;
	}
</script>

<PropSection title="Items">
	<div class="prop-field">
		<label class="prop-label" for="gal-source">Data source</label>
		<select id="gal-source" class="ctrl-select" value={element.props.dataSourceId ?? ''} onchange={onSourceChange}>
			<option value="">Select a data source…</option>
			{#each availableDataSources() as s (s.id)}
				<option value={s.id}>{s.name}</option>
			{/each}
		</select>
	</div>
</PropSection>

<PropSection title="Card">
	<div class="prop-field">
		<span class="prop-label">Layout</span>
		<Segmented
			options={GALLERY_CARD_LAYOUTS}
			value={element.props.cardLayout}
			onchange={(v) => (element.props.cardLayout = v)}
		/>
	</div>
	<div class="gal-field-list">
		{#each element.props.fields as f, i (f.key)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="gal-field-row"
				class:drag-over={overIndex === i && dragIndex !== i}
				draggable="true"
				ondragstart={() => onFieldDragStart(i)}
				ondragover={(e) => onFieldDragOver(e, i)}
				ondrop={() => onFieldDrop(i)}
				ondragend={onFieldDragEnd}
			>
				<div class="gal-field-row-header">
					<span class="gal-field-grip"><Icon name="grip" size={13} /></span>
					<span class="gal-field-label">{GALLERY_FIELD_DEFS[f.key].label}</span>
					<Switch bind:checked={f.enabled} />
				</div>
				{#if f.enabled}
					<GalleryFieldExpression fieldConfig={f} columns={source?.columns ?? []} placeholder={fieldPlaceholder(f.key)} />
				{/if}
			</div>
		{/each}
	</div>
	<p class="prop-hint">Applied to every item — mix static text with a column or variable chip. Drag to reorder.</p>
</PropSection>

<PropSection title="Layout">
	<div class="prop-field prop-field-row">
		<span class="prop-label">Fill height</span>
		<Switch bind:checked={element.props.fillHeight} />
	</div>
	<div class="prop-field">
		<span class="prop-label">Rows</span>
		<Segmented
			options={[
				{ value: 'auto', label: 'Auto' },
				{ value: 'manual', label: 'Manual' }
			]}
			value={element.props.rows === 'auto' ? 'auto' : 'manual'}
			onchange={(v) => {
				if (v === 'auto') element.props.rows = 'auto';
				else element.props.rows = typeof element.props.rows === 'number' ? element.props.rows : 2;
			}}
		/>
	</div>
	{#if element.props.rows !== 'auto'}
		<div class="prop-field prop-field-row">
			<span class="prop-label">Row count</span>
			<div class="gal-rows-stepper">
				<button
					type="button"
					disabled={element.props.rows <= 1}
					onclick={() => (element.props.rows = Math.max(1, element.props.rows - 1))}
				>
					<Icon name="minus" size={12} />
				</button>
				<span class="gal-rows-value">{element.props.rows}</span>
				<button
					type="button"
					disabled={element.props.rows >= 12}
					onclick={() => (element.props.rows = Math.min(12, element.props.rows + 1))}
				>
					<Icon name="plus" size={12} />
				</button>
			</div>
		</div>
	{/if}
	<p class="prop-hint">
		{#if element.props.rows === 'auto'}
			Fits as many rows as the available space allows{#if element.props.fillHeight}, adding a row instead of
				stretching existing ones whenever there's room for a whole extra one — and stretching them a little
				when there's some room left over, but not enough for that{:else}
				(2, since there's no fixed space to fit rows into with Fill height off){/if}.
		{:else if element.props.fillHeight}
			Stretches to fill the column (or, placed inside a grid, the cell) it's in — each row's height adjusts so
			{element.props.rows} row{element.props.rows === 1 ? '' : 's'} always fill that space exactly, no more and
			no less.
		{:else}
			Sized to exactly fit {element.props.rows} row{element.props.rows === 1 ? '' : 's'} at each card's natural
			height — nothing more.
		{/if}
		Cards are never narrower than 160px or wider than 320px, and always grow to fill each row — whatever doesn't
		fit becomes another page instead of scrolling.
		{#if element.props.fillHeight && element.props.cardLayout !== 'horizontal'}
			A row is also never squeezed shorter than a legible minimum — past that point, extra rows you set here just
			won't fit and are capped automatically, rather than shrinking every row to squeeze them all in.
		{/if}
	</p>
	<div class="prop-field">
		<span class="prop-label">Gap</span>
		<div class="gal-gap-row">
			<input type="range" min="0" max="64" bind:value={element.props.gap} />
			<input class="ctrl-text gal-gap-num" type="number" min="0" max="64" bind:value={element.props.gap} />
		</div>
	</div>
	<div class="prop-field prop-field-row">
		<span class="prop-label">Show Refresh/Reset buttons</span>
		<Switch bind:checked={element.props.showControls} />
	</div>
</PropSection>

{#if source}
	<PropSection title="Filters" defaultOpen={false}>
		{#if !element.props.filters || element.props.filters.length === 0}
			<p class="prop-hint">No filters yet.</p>
		{:else}
			<ul class="gal-filter-list">
				{#each element.props.filters as filter, i (filter.id)}
					<li class="gal-filter-row">
						<button type="button" class="gal-filter-desc" onclick={() => (openFilterIndex = i)}>
							{describeFilter(filter)}
						</button>
						<button type="button" class="icon-btn" data-tooltip="Remove filter" onclick={() => removeFilter(i)}>
							<Icon name="trash" size={13} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		<button type="button" class="add-btn" onclick={() => (openFilterIndex = 'new')}>+ Add filter</button>

		{#if element.props.filters.length >= 2}
			<div class="prop-field">
				<span class="prop-label">Combine filters with</span>
				<Segmented
					options={[
						{ value: 'AND', label: 'AND' },
						{ value: 'OR', label: 'OR' }
					]}
					value={element.props.combinator}
					onchange={(v) => (element.props.combinator = v)}
				/>
			</div>
		{/if}
	</PropSection>

	<EventsSection {element} popover={DataLookupEventPopover} describe={describeSelectEvent} popoverProps={{ source }} />
{/if}

{#if openFilterIndex !== null && source}
	<FilterPopover
		{element}
		{source}
		filter={openFilterIndex === 'new' ? null : element.props.filters[openFilterIndex]}
		onclose={() => (openFilterIndex = null)}
	/>
{/if}

<style>
	.gal-field-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.gal-field-row {
		border: 1px solid #e2e4e8;
		border-radius: 8px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: #fafafb;
	}
	.gal-field-row.drag-over {
		border-color: #0b57d0;
		background: #f2f6fe;
	}
	.gal-field-row-header {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: grab;
	}
	.gal-field-row-header:active {
		cursor: grabbing;
	}
	.gal-field-grip {
		flex-shrink: 0;
		display: flex;
		color: #5a5f68;
	}
	.gal-field-label {
		flex: 1;
		min-width: 0;
		font-size: 12.5px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.gal-rows-stepper {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 3px;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
	}
	.gal-rows-stepper button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 5px;
		background: none;
		color: #5a5f68;
		cursor: pointer;
	}
	.gal-rows-stepper button:hover:not(:disabled) {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.gal-rows-stepper button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.gal-rows-value {
		min-width: 20px;
		text-align: center;
		font-size: 12.5px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.gal-gap-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.gal-gap-row input[type='range'] {
		flex: 1;
		min-width: 0;
	}
	.gal-gap-num {
		width: 48px;
		flex-shrink: 0;
		padding: 8px 6px;
		text-align: center;
	}
	.gal-filter-list {
		list-style: none;
		margin: 0 0 10px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		border: 1px solid #e2e4e8;
		border-radius: 6px;
		overflow: hidden;
	}
	.gal-filter-row {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #fff;
	}
	.gal-filter-row:nth-child(even) {
		background: #fafafb;
	}
	.gal-filter-desc {
		flex: 1;
		min-width: 0;
		text-align: left;
		border: none;
		background: none;
		padding: 8px 10px;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 12px;
		color: #1a1c1e;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.gal-filter-desc:hover {
		color: #0b57d0;
	}
	.gal-filter-row .icon-btn {
		flex-shrink: 0;
		margin-right: 6px;
		border: none;
	}
</style>
