<script>
	import { getDataSourceById } from '../dataSources.js';
	import { filterRows, resetFilterSources } from '../dataLookup.js';
	import { previewCommands } from '../state.svelte.js';
	import { runRowSelectEvents } from '../events.js';

	let { element, preview = false } = $props();

	let source = $derived(getDataSourceById(element.props.dataSourceId));
	let columns = $derived(
		element.props.columns?.length ? element.props.columns.filter((c) => c.visible).map((c) => c.name) : (source?.columns ?? [])
	);

	// Shows every row of the current source until "Refresh" is clicked — never
	// auto-refiltered as a referenced component's value changes, so typing
	// into another field doesn't move the table out from under you.
	let displayedRows = $state([]);
	let selectedRowIndex = $state(null);

	$effect(() => {
		displayedRows = source?.rows ?? [];
		selectedRowIndex = null;
	});

	function onRefresh() {
		displayedRows = filterRows(source, element.props.filters, element.props.combinator);
		selectedRowIndex = null;
	}

	function onResetFilters() {
		resetFilterSources(element.props.filters);
		displayedRows = source?.rows ?? [];
		selectedRowIndex = null;
	}

	// A button's "Refresh"/"Reset filters" event reaches this specific
	// instance through a one-shot command nonce (see state.svelte.js) rather
	// than a value override — there's no "value" to set, just an action to run.
	$effect(() => {
		if (previewCommands[element.id]?.refresh !== undefined) onRefresh();
	});
	$effect(() => {
		if (previewCommands[element.id]?.resetFilters !== undefined) onResetFilters();
	});

	function selectRow(i) {
		const wasSelected = selectedRowIndex === i;
		selectedRowIndex = wasSelected ? null : i;
		if (preview && !wasSelected) runRowSelectEvents(element, displayedRows[i]);
	}

	function formatCell(value) {
		if (value === null || value === undefined) return '';
		if (Array.isArray(value)) return value.join(', ');
		return String(value);
	}
</script>

<div class="fi-lookup" class:fill={element.props.fillHeight}>
	{#if !source}
		<div class="fi-lookup-empty">Select a data source in the properties panel.</div>
	{:else}
		<div
			class="fi-lookup-table-wrap"
			style={element.props.fillHeight ? '' : `height:${element.props.fixedHeight || 200}px;`}
		>
			<table class="fi-lookup-table">
				<thead>
					<tr>
						{#each columns as col (col)}
							<th>{col}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each displayedRows as row, i (i)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<tr
							class:selected={selectedRowIndex === i}
							onclick={() => selectRow(i)}
							role="button"
							tabindex="0"
						>
							{#each columns as col (col)}
								<td>{formatCell(row[col])}</td>
							{/each}
						</tr>
					{:else}
						<tr>
							<td class="fi-lookup-none" colspan={columns.length || 1}>No matching rows.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="fi-lookup-footer">
			<span class="fi-lookup-count">{displayedRows.length} of {source.rows.length} rows</span>
			{#if element.props.showControls}
				<div class="fi-lookup-actions">
					<button type="button" class="fi-lookup-reset" onclick={onResetFilters}>Reset filters</button>
					<button type="button" class="fi-lookup-refresh" onclick={onRefresh}>Refresh</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.fi-lookup {
		width: 100%;
		font-family: var(--fi-font);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}
	.fi-lookup.fill {
		height: 100%;
		/* Without a floor, a flex-basis:0 "fill" item has nothing forcing a
		   natural size, so in a column with other non-fill siblings it can
		   collapse toward 0 instead of settling at a usable size (matches
		   Fixed mode's own 200px default — see .fi-lookup-table-wrap below
		   for where the *internal* table scroll still needs min-height:0). */
		min-height: 200px;
	}
	.fi-lookup-empty {
		padding: 16px;
		text-align: center;
		font-size: 13px;
		color: var(--fi-on-surface-variant);
		background: var(--fi-surface);
		border: 1px dashed var(--fi-outline);
		border-radius: var(--fi-radius);
	}
	.fi-lookup-table-wrap {
		width: 100%;
		overflow: auto;
		border: 1px solid var(--fi-outline);
		border-bottom: none;
		border-radius: var(--fi-radius) var(--fi-radius) 0 0;
		box-sizing: border-box;
	}
	.fi-lookup.fill .fi-lookup-table-wrap {
		flex: 1;
		min-height: 0;
	}
	.fi-lookup-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		white-space: nowrap;
	}
	.fi-lookup-table th,
	.fi-lookup-table td {
		padding: 8px 12px;
		text-align: left;
		border-bottom: 1px solid var(--fi-outline);
	}
	.fi-lookup-table th {
		position: sticky;
		top: 0;
		background: var(--fi-surface);
		color: var(--fi-on-surface-variant);
		font-weight: 600;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.fi-lookup-table td {
		color: var(--fi-on-surface);
		max-width: 240px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.fi-lookup-table tbody tr:last-child td {
		border-bottom: none;
	}
	.fi-lookup-table tbody tr {
		cursor: pointer;
	}
	.fi-lookup-table tbody tr:hover td {
		background: color-mix(in srgb, var(--fi-primary) 6%, transparent);
	}
	.fi-lookup-table tbody tr.selected td {
		background: color-mix(in srgb, var(--fi-primary) 14%, transparent);
	}
	.fi-lookup-none {
		text-align: center;
		color: var(--fi-on-surface-variant);
		white-space: normal;
		cursor: default;
	}
	.fi-lookup-footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 12px;
		border: 1px solid var(--fi-outline);
		border-radius: 0 0 var(--fi-radius) var(--fi-radius);
		background: var(--fi-surface);
		box-sizing: border-box;
	}
	.fi-lookup-count {
		font-size: 12px;
		color: var(--fi-on-surface-variant);
	}
	.fi-lookup-actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.fi-lookup-reset {
		flex-shrink: 0;
		font-family: inherit;
		font-size: 12px;
		font-weight: 500;
		padding: 6px 14px;
		border-radius: var(--fi-radius);
		border: 1px solid var(--fi-outline);
		background: transparent;
		color: var(--fi-on-surface-variant);
		cursor: pointer;
	}
	.fi-lookup-refresh {
		flex-shrink: 0;
		font-family: inherit;
		font-size: 12px;
		font-weight: 500;
		padding: 6px 14px;
		border-radius: var(--fi-radius);
		border: none;
		background: var(--fi-primary);
		color: #fff;
		cursor: pointer;
	}
</style>
