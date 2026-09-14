<script>
	import TextElement from './elements/TextElement.svelte';
	import TextFieldElement from './elements/TextFieldElement.svelte';
	import ButtonElement from './elements/ButtonElement.svelte';
	import OptionsElement from './elements/OptionsElement.svelte';
	import ImageElement from './elements/ImageElement.svelte';
	import LabelSelectorElement from './elements/LabelSelectorElement.svelte';
	import LabelPreviewElement from './elements/LabelPreviewElement.svelte';
	import DateElement from './elements/DateElement.svelte';
	import DividerElement from './elements/DividerElement.svelte';
	import NumberElement from './elements/NumberElement.svelte';
	import DataLookupElement from './elements/DataLookupElement.svelte';
	import GalleryElement from './elements/GalleryElement.svelte';
	import { resolveProp, VALUE_PROP } from './bindings.js';

	const renderers = {
		text: TextElement,
		textfield: TextFieldElement,
		button: ButtonElement,
		options: OptionsElement,
		image: ImageElement,
		labelSelector: LabelSelectorElement,
		labelPreview: LabelPreviewElement,
		date: DateElement,
		divider: DividerElement,
		number: NumberElement,
		dataLookup: DataLookupElement,
		gallery: GalleryElement
	};

	let { element, preview = false } = $props();
	let Comp = $derived(renderers[element.type]);

	// Resolve a bound or preview-overridden content/defaultValue into a plain
	// element so leaf renderers never need to know bindings/overrides exist.
	let effectiveElement = $derived.by(() => {
		const key = VALUE_PROP[element.type];
		if (!key) return element;
		return { ...element, props: { ...element.props, [key]: resolveProp(element, key) } };
	});
</script>

<Comp element={effectiveElement} {preview} />
