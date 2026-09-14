<script>
	import Segmented from './Segmented.svelte';
	import VisualPicker from './VisualPicker.svelte';
	import PropSection from './PropSection.svelte';
	import Icon from '../Icon.svelte';
	import VisibilityFields from './VisibilityFields.svelte';
	import DynamicValueField from './DynamicValueField.svelte';
	import { getDataSourceById } from '../dataSources.js';
	import { availableDataSources } from '../projects.js';

	let { element } = $props();

	let mappedSource = $derived(getDataSourceById(element.props.mappedSourceId));

	function addOption() {
		element.props.options.push(`Option ${element.props.options.length + 1}`);
	}
	function removeOption(i) {
		element.props.options.splice(i, 1);
	}

	function onMappedSourceChange(e) {
		element.props.mappedSourceId = e.currentTarget.value || null;
		element.props.mappedColumn = null;
	}
</script>

<PropSection title="Content">
	<div class="prop-field">
		<label class="prop-label" for="opt-label">Label</label>
		<input id="opt-label" class="ctrl-text" type="text" bind:value={element.props.label} />
	</div>
	<div class="prop-field">
		<span class="prop-label">Type</span>
		<VisualPicker
			options={[
				{ value: 'dropdown', label: 'Dropdown', icon: 'dropdown' },
				{ value: 'radio', label: 'Radio', icon: 'radio' },
				{ value: 'checkbox', label: 'Checkbox', icon: 'checkbox' }
			]}
			value={element.props.mode}
			onchange={(v) => (element.props.mode = v)}
		/>
	</div>
	<div class="prop-field">
		<span class="prop-label">Choices</span>
		<Segmented
			options={[
				{ value: 'manual', label: 'Manual' },
				{ value: 'mapped', label: 'Mapped' }
			]}
			value={element.props.sourceMode ?? 'manual'}
			onchange={(v) => (element.props.sourceMode = v)}
		/>
	</div>
	{#if (element.props.sourceMode ?? 'manual') === 'manual'}
		<div class="prop-field">
			<div class="options-editor">
				{#each element.props.options as _, i}
					<div class="option-row">
						<input class="ctrl-text" type="text" bind:value={element.props.options[i]} />
						<button
							type="button"
							class="icon-btn"
							data-tooltip="Remove"
							disabled={element.props.options.length <= 1}
							onclick={() => removeOption(i)}
						>
							<Icon name="trash" size={14} />
						</button>
					</div>
				{/each}
				<button type="button" class="add-btn" onclick={addOption}>+ Add choice</button>
			</div>
		</div>
	{:else}
		<div class="prop-field">
			<label class="prop-label" for="opt-map-source">Data source</label>
			<select
				id="opt-map-source"
				class="ctrl-select"
				value={element.props.mappedSourceId ?? ''}
				onchange={onMappedSourceChange}
			>
				<option value="">Select a data source…</option>
				{#each availableDataSources() as s (s.id)}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</div>
		{#if mappedSource}
			<div class="prop-field">
				<label class="prop-label" for="opt-map-column">Column</label>
				<select id="opt-map-column" class="ctrl-select" bind:value={element.props.mappedColumn}>
					<option value="">Select a column…</option>
					{#each mappedSource.columns as col (col)}
						<option value={col}>{col}</option>
					{/each}
				</select>
			</div>
			<p class="prop-hint">Shows every distinct value of that column as a choice.</p>
		{/if}
	{/if}
	<DynamicValueField {element} fieldKey="defaultValue" label="Default Value" placeholder="Match a choice above" />
	<p class="prop-hint">Match a choice above exactly to pre-select it.</p>
</PropSection>

<VisibilityFields {element} />
