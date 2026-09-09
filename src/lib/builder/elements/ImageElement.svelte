<script>
	import Icon from '../Icon.svelte';
	let { element } = $props();
</script>

<div class="fi-image">
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
		height: 220px;
		border-radius: var(--fi-radius);
		overflow: hidden;
		background: #e9eaec;
		box-sizing: border-box;
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
