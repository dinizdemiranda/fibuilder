<script>
	let { element } = $props();
</script>

{#if element.props.variant === 'heading1'}
	<h1 class="fi-text fi-h1" class:fi-empty={!element.props.content} style:text-align={element.props.align}>
		{element.props.content || 'Heading'}
	</h1>
{:else if element.props.variant === 'heading2'}
	<h2 class="fi-text fi-h2" class:fi-empty={!element.props.content} style:text-align={element.props.align}>
		{element.props.content || 'Heading'}
	</h2>
{:else}
	<p class="fi-text fi-body" class:fi-empty={!element.props.content} style:text-align={element.props.align}>
		{element.props.content || 'Text'}
	</p>
{/if}

<style>
	.fi-text {
		margin: 0;
		min-height: 1.4em;
		font-family: var(--fi-font);
		color: var(--fi-on-surface);
	}
	/* An empty text component would otherwise collapse to zero height (no
	   content for line-height to apply to) and become unclickable on the
	   canvas — show a faint placeholder in its place instead, same idea as
	   an empty text input's placeholder. Preview always has real content by
	   then (or the field is meant to read as genuinely blank), so this only
	   ever shows while still designing. */
	.fi-empty {
		color: #b0b4bb;
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
