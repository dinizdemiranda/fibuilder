<script>
	import { doc, uiState, selectedElement, removeElement, removeColumn, trySyncNameFromLabel } from './state.svelte.js';
	import { blockDefs } from './types.js';
	import PageProperties from './properties/PageProperties.svelte';
	import ColumnProperties from './properties/ColumnProperties.svelte';
	import TextProperties from './properties/TextProperties.svelte';
	import TextFieldProperties from './properties/TextFieldProperties.svelte';
	import ButtonProperties from './properties/ButtonProperties.svelte';
	import OptionsProperties from './properties/OptionsProperties.svelte';
	import ImageProperties from './properties/ImageProperties.svelte';
	import SectionProperties from './properties/SectionProperties.svelte';
	import GridProperties from './properties/GridProperties.svelte';
	import LabelSelectorProperties from './properties/LabelSelectorProperties.svelte';
	import LabelPreviewProperties from './properties/LabelPreviewProperties.svelte';
	import DateProperties from './properties/DateProperties.svelte';
	import DividerProperties from './properties/DividerProperties.svelte';
	import NumberProperties from './properties/NumberProperties.svelte';
	import DataLookupProperties from './properties/DataLookupProperties.svelte';
	import GalleryProperties from './properties/GalleryProperties.svelte';
	import ElementIdentity from './properties/ElementIdentity.svelte';
	import Icon from './Icon.svelte';
	import './properties/panel.css';

	const forms = {
		text: TextProperties,
		textfield: TextFieldProperties,
		button: ButtonProperties,
		options: OptionsProperties,
		image: ImageProperties,
		section: SectionProperties,
		grid: GridProperties,
		labelSelector: LabelSelectorProperties,
		labelPreview: LabelPreviewProperties,
		date: DateProperties,
		divider: DividerProperties,
		number: NumberProperties,
		dataLookup: DataLookupProperties,
		gallery: GalleryProperties
	};

	let element = $derived(selectedElement());
	let selectedColSide = $derived(
		uiState.selectedId === 'col-a' ? 'a' : uiState.selectedId === 'col-b' ? 'b' : null
	);
	let Form = $derived(element ? forms[element.type] : null);

	// Keeps a component's name mirroring its Label field live as the user
	// types — see trySyncNameFromLabel for the manual-rename opt-out.
	$effect(() => {
		if (element?.props?.label !== undefined) trySyncNameFromLabel(element);
	});
</script>

<aside class="properties">
	<div class="properties-header">
		{#if element}
			<ElementIdentity {element} />
			<button
				type="button"
				class="icon-btn"
				data-tooltip="Delete element"
				onclick={() => removeElement(element.id)}
			>
				<Icon name="trash" size={14} />
			</button>
		{:else if selectedColSide}
			<span class="header-title">Column {selectedColSide === 'a' ? 'A' : 'B'}</span>
			{#if doc.page.columns === 2}
				<button
					type="button"
					class="icon-btn"
					data-tooltip="Remove column"
					onclick={() => removeColumn(selectedColSide)}
				>
					<Icon name="trash" size={14} />
				</button>
			{/if}
		{:else}
			<span class="header-title">Page properties</span>
		{/if}
	</div>
	<div class="properties-scroll">
		{#if element && Form}
			<Form {element} />
		{:else if selectedColSide}
			<ColumnProperties side={selectedColSide} />
		{:else}
			<PageProperties />
		{/if}
	</div>
</aside>

<style>
	.properties {
		width: 300px;
		flex-shrink: 0;
		border-left: 1px solid #e2e4e8;
		background: #fafafb;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
		min-height: 0;
	}
	.properties-header {
		min-height: 44px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border-bottom: 1px solid #e2e4e8;
		box-sizing: border-box;
	}
	.header-title {
		font-size: 13px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.properties-scroll {
		flex: 1;
		overflow-y: auto;
	}
</style>
