<script>
	let { element } = $props();
</script>

{#if element.props.variant === 'heading1'}
	<h1 class="fi-text fi-h1" style:text-align={element.props.align}>{element.props.content}</h1>
{:else if element.props.variant === 'heading2'}
	<h2 class="fi-text fi-h2" style:text-align={element.props.align}>{element.props.content}</h2>
{:else}
	<p class="fi-text fi-body" style:text-align={element.props.align}>{element.props.content}</p>
{/if}

<style>
	.fi-text {
		margin: 0;
		font-family: var(--fi-font);
		color: var(--fi-on-surface);
	}
	.fi-h1 {
		font-size: 28px;
		font-weight: 500;
		line-height: 1.25;
	}
	.fi-h2 {
		font-size: 20px;
		font-weight: 500;
		line-height: 1.3;
	}
	.fi-body {
		font-size: 14px;
		font-weight: 400;
		line-height: 1.5;
	}
</style>
