<script>
	import PropSection from './PropSection.svelte';
	import Segmented from './Segmented.svelte';
	import Switch from './Switch.svelte';
	import Icon from '../Icon.svelte';
	import FilterPopover from './FilterPopover.svelte';
	import EventsSection from './EventsSection.svelte';
	import DataLookupEventPopover from './DataLookupEventPopover.svelte';
	import { dataSources, getDataSourceById } from '../dataSources.js';
	import { describeFilter } from '../dataLookup.js';
	import { describeSelectEvent } from '../events.js';

	let { element } = $props();

	let source = $derived(getDataSourceById(element.props.dataSourceId));
	let openFilterIndex = $state(null); // number = editing that filter, 'new' = adding, null = closed

	let visibleCount = $derived(element.props.columns.filter((c) => c.visible).length);

	let dragIndex = $state(null);
	let overIndex = $state(null);

	function onSourceChange(e) {
		const id = e.currentTarget.value || null;
		element.props.dataSourceId = id;
		const newSource = getDataSourceById(id);
		element.props.columns = newSource ? newSource.columns.map((name) => ({ name, visible: true })) : [];
		element.props.filters = [];
	}

	function removeFilter(i) {
		element.props.filters.splice(i, 1);
	}

	function onColDragStart(i) {
		dragIndex = i;
	}
	function onColDragOver(e, i) {
		e.preventDefault();
		overIndex = i;
	}
	function onColDrop(i) {
		if (dragIndex === null || dragIndex === i) {
			dragIndex = null;
			overIndex = null;
			return;
		}
		const cols = element.props.columns;
		const [moved] = cols.splice(dragIndex, 1);
		cols.splice(i, 0, moved);
		dragIndex = null;
		overIndex = null;
	}
	function onColDragEnd() {
		dragIndex = null;
		overIndex = null;
	}
	// Hiding a column sinks it to the bottom of the list, out of the way of
	// the ones actually being shown; showing it again just leaves it where it
	// landed — drag it back up if that's not where you want it.
	function toggleColVisible(i) {
		const cols = element.props.columns;
		const col = cols[i];
		col.visible = !col.visible;
		if (!col.visible) {
			cols.splice(i, 1);
			cols.push(col);
		}
	}
</script>

<PropSection title="Data Source">
	<div class="prop-field">
		<label class="prop-label" for="dl-source">Source</label>
		<select id="dl-source" class="ctrl-select" value={element.props.dataSourceId ?? ''} onchange={onSourceChange}>
			<option value="">Select a data source…</option>
			{#each dataSources as s (s.id)}
				<option value={s.id}>{s.name}</option>
			{/each}
		</select>
	</div>
</PropSection>

{#if source}
	<PropSection title="Columns">
		
		<div class="col-list">
			{#each element.props.columns as col, i (col.name)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="col-row"
					class:hidden-col={!col.visible}
					class:drag-over={overIndex === i && dragIndex !== i}
					draggable="true"
					ondragstart={() => onColDragStart(i)}
					ondragover={(e) => onColDragOver(e, i)}
					ondrop={() => onColDrop(i)}
					ondragend={onColDragEnd}
				>
					<span class="col-grip"><Icon name="grip" size={13} /></span>
					<span class="col-name">{col.name}</span>
					<button
						type="button"
						class="icon-btn col-visibility-btn"
						onclick={() => toggleColVisible(i)}
						
					>
						<Icon name="preview" size={14} />
					</button>
				</div>
			{/each}
		</div>
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
				<label class="prop-label" for="dl-fixed-height">Height (px)</label>
				<input id="dl-fixed-height" class="ctrl-text" type="number" min="0" bind:value={element.props.fixedHeight} />
			</div>
		{:else}
			<p class="prop-hint">
				Fill stretches the table to take up all the vertical space available in its column — the section or page
				it sits in must have room to give.
			</p>
		{/if}
		<div class="prop-field prop-field-row">
			<span class="prop-label">Show Refresh/Reset buttons</span>
			<Switch bind:checked={element.props.showControls} />
		</div>
		
	</PropSection>

	<PropSection title="Filters" defaultOpen={false}>
		{#if !element.props.filters || element.props.filters.length === 0}
			<p class="prop-hint">No filters yet.</p>
		{:else}
			<ul class="dl-filter-list">
				{#each element.props.filters as filter, i (filter.id)}
					<li class="dl-filter-row">
						<button type="button" class="dl-filter-desc" onclick={() => (openFilterIndex = i)}>
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
	/* .icon-btn is a shared 28x28 bordered button used all over the
	   properties panel — overridden here rather than globally, since this
	   one row is dense enough to want something smaller and borderless. */
	.col-visibility-btn {
		width: 20px;
		height: 20px;
		padding: 0;
		border: none;
	}
	.col-list {
		max-height: 120px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-right: 2px;
		border-radius: 4px;
		padding: 4px;
		border: 1px solid #e2e4e8;
	}
	.col-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 2px 4px;
		border: 1px solid #e2e4e8;
		border-radius: 4px;
		background: #fafafb;
		cursor: grab;
	}
	.col-row:active {
		cursor: grabbing;
	}
	.col-row.drag-over {
		border-color: #0b57d0;
		background: #f2f6fe;
	}
	.col-row.hidden-col {
		opacity: 0.5;
	}
	.col-row.hidden-col .icon-btn {
		color: #0b57d0;
	}
	.col-grip {
		flex-shrink: 0;
		display: flex;
		color: #5a5f68;
	}
	.col-name {
		flex: 1;
		min-width: 0;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 11px;
		color: #1a1c1e;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.dl-filter-list {
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
	.dl-filter-row {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #fff;
	}
	.dl-filter-row:nth-child(even) {
		background: #fafafb;
	}
	.dl-filter-desc {
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
	.dl-filter-desc:hover {
		color: #0b57d0;
	}
	.dl-filter-row .icon-btn {
		flex-shrink: 0;
		margin-right: 6px;
		border: none;
	}
</style>
