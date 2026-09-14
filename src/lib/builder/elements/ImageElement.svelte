<script>
	import Icon from '../Icon.svelte';

	let { element } = $props();

	// element.props.src arrives here already resolved (bound expression,
	// condition, or a live "Set a field" override from a Data Lookup/
	// Gallery row-select or a Button click) — image is a VALUE_PROP entry
	// (bindings.js), so ElementRenderer.svelte's generic wrapper resolves
	// it before this component ever sees it, same as every other
	// value-bearing component type.
</script>

<div class="fi-image" class:fill={element.props.fillHeight} style={element.props.fillHeight ? '' : 'height: 220px;'}>
	{#if element.props.src}
		<img src={element.props.src} alt={element.props.alt} />
	{:else}
		<div class="fi-image-placeholder">
			<Icon name="image" size={28} />
			<span>Image</span>
		</div>
	{/if}
</div>

<style>
	.fi-image {
		width: 100%;
		border-radius: var(--fi-radius);
		overflow: hidden;
		background: #e9eaec;
		box-sizing: border-box;
	}
	.fi-image.fill {
		height: 100%;
		min-height: 220px;
	}
	.fi-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.fi-image-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		color: #9aa0a8;
		font-family: var(--fi-font);
		font-size: 12px;
	}
</style>
