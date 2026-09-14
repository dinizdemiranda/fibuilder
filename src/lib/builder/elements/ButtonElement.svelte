<script>
	import { runEvent } from '../events.js';

	let { element, preview = false } = $props();

	function onClick() {
		if (!preview) return;
		for (const event of element.events ?? []) {
			if (event.trigger === 'click') runEvent(event);
		}
	}

	let variant = $derived(element.props.variant ?? 'primary');
	let size = $derived(element.props.size ?? 'normal');
</script>

<button
	type="button"
	class="fi-btn fi-btn--{variant} fi-btn--{size}"
	class:fi-btn--full={element.props.fullWidth}
	onclick={onClick}
>
	{element.props.label}
</button>

<style>
	.fi-btn {
		font-family: var(--fi-font);
		font-weight: 500;
		border-radius: var(--fi-radius);
		cursor: pointer;
		box-sizing: border-box;
	}
	/* The wrapper's own width (blockWidthStyle, layout.js) already fills the
	   row/column when fullWidth is on — a <button> is inline-block by
	   default though, so it still needs its own width:100% to actually
	   stretch to match that wrapper instead of just hugging its label. */
	.fi-btn--full {
		width: 100%;
	}
	.fi-btn--primary {
		border: none;
		background: var(--fi-primary);
		color: #fff;
	}
	.fi-btn--secondary {
		border: 1.5px solid var(--fi-primary);
		background: transparent;
		color: var(--fi-primary);
	}
	.fi-btn--text {
		border: none;
		background: none;
		color: var(--fi-primary);
	}
	.fi-btn--small {
		padding: 6px 14px;
		font-size: 12.5px;
	}
	.fi-btn--normal {
		padding: 10px 20px;
		font-size: 14px;
	}
	.fi-btn--large {
		padding: 14px 28px;
		font-size: 16px;
	}
	.fi-btn--text.fi-btn--small {
		padding: 6px 4px;
	}
	.fi-btn--text.fi-btn--normal {
		padding: 10px 4px;
	}
	.fi-btn--text.fi-btn--large {
		padding: 14px 4px;
	}
</style>
