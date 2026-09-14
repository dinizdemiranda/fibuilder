<script>
	import { blockDefs, libraryGroups } from './types.js';
	import { doc, uiState, addElement, beginDragNew, endDrag, selectElement } from './state.svelte.js';
	import { getLabelById, formatDimensions, getLabelThumbnail } from './labels.js';
	import { availableDataSources } from './projects.js';
	import { VARIABLE_TYPES, typeIcon, removeVariable } from './variables.js';
	import { NOW_SENTINEL } from './bindings.js';
	import Icon from './Icon.svelte';
	import LabelPickerModal from './LabelPickerModal.svelte';
	import LabelPopover from './LabelPopover.svelte';
	import DataSourceModal from './DataSourceModal.svelte';
	import VariableModal from './VariableModal.svelte';

	const tabs = [
		{ id: 'library', label: 'Library', icon: 'section' },
		{ id: 'labels', label: 'Labels', icon: 'label' },
		{ id: 'objects', label: 'Objects', icon: 'layers' },
		{ id: 'data', label: 'Data', icon: 'database' }
	];

	// Flat-with-indent list of every element on the canvas, for the Objects pane.
	// Sections and Grids are one level deep at most, so a single pass is enough.
	let objectList = $derived.by(() => {
		const out = [];
		const walk = (list) => {
			for (const el of list) {
				out.push({ id: el.id, name: el.name, type: el.type, depth: 0 });
				if (el.type === 'section' || el.type === 'grid') {
					for (const child of el.children) {
						if (child) out.push({ id: child.id, name: child.name, type: child.type, depth: 1 });
					}
				}
			}
		};
		walk(doc.elements);
		walk(doc.elementsB);
		return out;
	});

	let activeTab = $state('library');
	let labelPickerOpen = $state(false);
	let popoverLabelId = $state(null);
	let openDataSourceId = $state(null);
	let currentDataSources = $derived(availableDataSources());
	let varTypeMenuOpen = $state(false);
	let variableModalType = $state(null); // set to a VARIABLE_TYPES value to open the create modal
	let editingVariable = $state(null); // set to a variable object to open the edit modal

	function onDragStart(e, type) {
		// There's no canvas to drop onto in Workflow mode — flip back to Design
		// so the same drag gesture lands on the newly-mounted drop zone.
		uiState.mode = 'design';
		beginDragNew(type);
		e.dataTransfer.setData('text/plain', type);
		e.dataTransfer.effectAllowed = 'copy';
	}

	function onLibItemClick(type) {
		uiState.mode = 'design';
		addElement(type);
	}

	function startCreateVariable(type) {
		varTypeMenuOpen = false;
		variableModalType = type;
	}

	function formatVariableDefault(v) {
		if (v.type === 'boolean') return v.defaultValue === 'true' ? 'true' : 'false';
		if (v.defaultValue === NOW_SENTINEL) return 'Current time';
		return v.defaultValue || '—';
	}

	// Canvas.svelte's own selection effect scrolls the target into view
	// (only the minimum needed, "nearest") whenever uiState.selectedId
	// changes — no need to duplicate that here.
</script>

<div class="library-shell">
	<nav class="tab-rail">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				class="rail-btn"
				class:active={activeTab === tab.id}
				onclick={() => (activeTab = tab.id)}
			>
				<Icon name={tab.icon} size={18} />
				<span class="rail-label">{tab.label}</span>
			</button>
		{/each}
	</nav>

	<aside class="library">
		{#if activeTab === 'library'}
			<div class="library-scroll">
				{#each libraryGroups as group (group.title)}
					<section class="library-section">
						<h3>{group.title}</h3>
						<div class="lib-grid">
							{#each group.items as type (type)}
								<button
									type="button"
									class="lib-item"
									draggable="true"
									ondragstart={(e) => onDragStart(e, type)}
									ondragend={endDrag}
									onclick={() => onLibItemClick(type)}
								>
									<span class="lib-icon-box"><Icon name={blockDefs[type].icon} size={22} /></span>
									<span class="lib-label">{blockDefs[type].label}</span>
								</button>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{:else if activeTab === 'labels'}
			<div class="library-scroll">
			<div class="labels-section">
				
				<h3>Labels</h3>
				<button type="button" class="add-labels-btn" onclick={() => (labelPickerOpen = true)}>
					<Icon name="plus" size={14} />
					Add labels
				</button>
				{#if doc.labels.length === 0}
					<div class="library-empty library-empty--inline">
						<Icon name="label" size={26} />
						<p>No labels yet</p>
					</div>
				{:else}
					<div class="labels-list">
						{#each doc.labels as id (id)}
							{@const label = getLabelById(id)}
							{#if label}
								<button type="button" class="label-card" onclick={() => (popoverLabelId = id)}>
									<span class="label-card-thumb">
										{#if getLabelThumbnail(id)}
											<img src={getLabelThumbnail(id)} alt={label.name} />
										{:else}
											<Icon name="label" size={28} />
										{/if}
									</span>
									<span class="label-card-name">{label.name}</span>
									<span class="label-card-dims">{formatDimensions(label)}</span>
								</button>
							{/if}
						{/each}
					</div>
				{/if}

			</div>
			</div>
		{:else if activeTab === 'objects'}
			<div class="library-scroll">
			<div class="objects-section">
				<h3>Objects</h3>
				{#if objectList.length === 0}
					<div class="library-empty library-empty--inline">
						<Icon name="layers" size={24} />
						<p>No objects on the page yet</p>
					</div>
				{:else}
					<ul class="objects-list">
						{#each objectList as obj (obj.id)}
							<li>
								<button
									type="button"
									class="objects-item"
									class:active={uiState.selectedId === obj.id}
									style="padding-left:{12 + obj.depth * 16}px;"
									onclick={() => selectElement(obj.id)}
								>
									<Icon name={blockDefs[obj.type]?.icon ?? 'text'} size={14} />
									<span>{obj.name}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			</div>
		{:else}
			<div class="library-scroll data-tab">
			<div class="data-sources-section">

				<h3>Data Sources</h3>
				{#if currentDataSources.length === 0}
				<div class="library-empty library-empty--inline">
					<Icon name="database" size={26} />
					<p>No data sources yet</p>
				</div>
				{:else}
				<div class="datasource-list">
					{#each currentDataSources as source (source.id)}
					<button type="button" class="datasource-row" onclick={() => (openDataSourceId = source.id)}>
						<span class="datasource-icon"><Icon name="database" size={18} /></span>
						<span class="datasource-info">
							<span class="datasource-name">{source.name}</span>
							<span class="datasource-count">{source.columns.length} columns</span>
						</span>
					</button>
					{/each}
				</div>
				{/if}
			</div>
				<div class="variables-section">
				<h3 class="variables-heading">Variables</h3>
				{#if doc.variables.length === 0}
					<p class="prop-hint">No variables yet.</p>
				{:else}
					<ul class="variables-list">
						{#each doc.variables as v (v.id)}
							<li class="variable-row">
								<button type="button" class="variable-desc" onclick={() => (editingVariable = v)}>
									<Icon name={typeIcon(v.type)} size={13} />
									<span class="variable-name">{v.name}</span>
									<span class="variable-default">{formatVariableDefault(v)}</span>
								</button>
								<button type="button" class="icon-btn" data-tooltip="Remove variable" onclick={() => removeVariable(v.id)}>
									<Icon name="trash" size={13} />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<div class="add-variable-wrap">
					<button type="button" class="add-btn" onclick={() => (varTypeMenuOpen = !varTypeMenuOpen)}>
						+ Add variable
					</button>
					{#if varTypeMenuOpen}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="var-type-backdrop" onclick={() => (varTypeMenuOpen = false)}></div>
						<div class="var-type-menu">
							{#each VARIABLE_TYPES as t (t.value)}
								<button type="button" onclick={() => startCreateVariable(t.value)}>
									<Icon name={t.icon} size={14} />
									{t.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
				</div>
			</div>
		{/if}
	</aside>
</div>

{#if labelPickerOpen}
	<LabelPickerModal onclose={() => (labelPickerOpen = false)} />
{/if}

{#if openDataSourceId}
	{@const activeSource = currentDataSources.find((s) => s.id === openDataSourceId)}
	{#if activeSource}
		<DataSourceModal source={activeSource} onclose={() => (openDataSourceId = null)} />
	{/if}
{/if}

{#if popoverLabelId}
	{@const popoverLabel = getLabelById(popoverLabelId)}
	{#if popoverLabel}
		<LabelPopover label={popoverLabel} onclose={() => (popoverLabelId = null)} />
	{/if}
{/if}

{#if variableModalType}
	<VariableModal type={variableModalType} onclose={() => (variableModalType = null)} />
{/if}

{#if editingVariable}
	<VariableModal variable={editingVariable} onclose={() => (editingVariable = null)} />
{/if}

<style>
	.library-shell {
		display: flex;
		flex-shrink: 0;
		min-height: 0;
	}
	.library-section, .labels-section, .objects-section, .data-sources-section, .variables-section {
		padding: 16px;
	}
	.variables-section {
		border-top: 1px solid #e2e4e8;
	}
	.data-tab {
		display: grid;
		grid-template-rows: 1fr 1fr;
	}
	.tab-rail {
		width: 60px;
		flex-shrink: 0;
		background: #fafafb;
		border-right: 1px solid #e2e4e8;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 8px;
		gap: 4px;
	}
	.rail-btn {
		width: 52px;
		border-radius: 8px;
		background: none;
		border: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 8px 2px;
		color: #8a8f98;
		cursor: pointer;
	}
	.rail-btn:hover {
		background: #eceef1;
		color: #1a1c1e;
	}
	.rail-btn.active {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.rail-label {
		font-size: 9px;
		font-weight: 600;
		line-height: 1.1;
		text-align: center;
	}
	.library {
		width: 300px;
		flex-shrink: 0;
		border-right: 1px solid #e2e4e8;
		background: #fafafb;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
		min-height: 0;
	}
	.library-scroll {
		flex: 1;
		overflow-y: auto;
	}
	.library-empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: #b0b4bb;
		padding: 24px;
		text-align: center;
	}
	.library-empty p {
		margin: 0;
		font-size: 12px;
	}
	.library-empty--inline {
		flex: none;
		padding: 40px 24px;
	}
	.variables-heading {
		margin-top: 8px;
	}
	.variables-list {
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
	.variable-row {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #fff;
	}
	.variable-row:nth-child(even) {
		background: #fafafb;
	}
	.variable-desc {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		text-align: left;
		border: none;
		background: none;
		padding: 8px 10px;
		font-family: inherit;
		color: #5a5f68;
		cursor: pointer;
	}
	.variable-desc:hover {
		color: #0b57d0;
	}
	.variable-name {
		font-size: 12px;
		font-weight: 600;
		color: #1a1c1e;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.variable-default {
		flex-shrink: 0;
		margin-left: auto;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 11px;
		color: #8a8f98;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 90px;
	}
	.variable-row .icon-btn {
		flex-shrink: 0;
		margin-right: 6px;
		border: none;
	}
	.add-variable-wrap {
		position: relative;
	}
	.var-type-backdrop {
		position: fixed;
		inset: 0;
		z-index: 19;
	}
	.var-type-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		width: 100%;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
		z-index: 20;
		padding: 4px;
		box-sizing: border-box;
	}
	.var-type-menu button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		text-align: left;
		padding: 8px;
		border: none;
		background: none;
		border-radius: 5px;
		font-family: inherit;
		font-size: 12px;
		color: #1a1c1e;
		cursor: pointer;
	}
	.var-type-menu button:hover {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.objects-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.objects-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border: none;
		background: none;
		border-radius: 6px;
		font-family: inherit;
		font-size: 12px;
		color: #2b2e33;
		cursor: pointer;
		text-align: left;
	}
	.objects-item:hover {
		background: #eceef1;
	}
	.objects-item.active {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.add-labels-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		padding: 9px 0;
		border: 1px dashed #c9cdd4;
		border-radius: 6px;
		background: #fff;
		color: #5a5f68;
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}
	.add-labels-btn:hover {
		border-color: #0b57d0;
		color: #0b57d0;
	}
	.labels-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}
	.label-card {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		background: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
		padding: 0;
	}
	.label-card-thumb {
		width: 100%;
		height: 110px;
		border-radius: 10px;
		background: #eceef1;
		border: 1px solid #e2e4e8;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
		box-sizing: border-box;
		overflow: hidden;
	}
	.label-card-thumb img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 6px;
		box-sizing: border-box;
	}
	.label-card:hover .label-card-thumb {
		border-color: #0b57d0;
		background: #f2f6fe;
		color: #0b57d0;
	}
	.label-card-name {
		font-size: 12px;
		color: #2b2e33;
		text-align: left;
	}
	.label-card-dims {
		font-size: 11px;
		color: #8a8f98;
		text-align: left;
		margin-top: -4px;
	}
	.datasource-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.datasource-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 10px;
		background: #fff;
		border: 1px solid #e2e4e8;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
	}
	.datasource-row:hover {
		border-color: #0b57d0;
		background: #f2f6fe;
	}
	.datasource-icon {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: #eceef1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
	}
	.datasource-row:hover .datasource-icon {
		background: #dfe9fd;
		color: #0b57d0;
	}
	.datasource-info {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.datasource-name {
		font-size: 13px;
		font-weight: 600;
		color: #1a1c1e;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.datasource-count {
		font-size: 11px;
		color: #8a8f98;
	}
	h3 {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #8a8f98;
		margin: 0 0 10px;
	}
	section + section {
		margin-top: 16px;
	}
	.lib-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.lib-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		width: 72px;
		max-width: 72px;
		padding: 2px 0;
		background: none;
		border: none;
		font-family: inherit;
		cursor: grab;
		user-select: none;
	}
	.lib-item:active {
		cursor: grabbing;
	}
	.lib-icon-box {
		position: relative;
		width: 56px;
		height: 56px;
		border-radius: 10px;
		background: #eceef1;
		border: 1px solid #e2e4e8;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
	}
	.lib-item:hover .lib-icon-box {
		border-color: #0b57d0;
		background: #f2f6fe;
		color: #0b57d0;
	}
	.lib-label {
		font-size: 11px;
		color: #2b2e33;
		text-align: center;
		line-height: 1.25;
	}
</style>
