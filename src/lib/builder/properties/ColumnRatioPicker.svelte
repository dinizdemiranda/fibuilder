<script>
	import { columnRatioParts } from '../layout.js';

	let { value, onchange, disabled = false } = $props();
	const ratios = ['50/50', '35/65', '65/35'];
</script>

<div class="ratio-picker">
	{#each ratios as ratio (ratio)}
		{@const [a, b] = columnRatioParts(ratio)}
		<button
			type="button"
			class:active={value === ratio}
			{disabled}
			data-tooltip={ratio.replace('/', ' / ')}
			aria-label={ratio.replace('/', ' / ')}
			onclick={() => onchange(ratio)}
		>
			<svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
				<rect x="0" y="0" width={(a / 100) * 28 - 1} height="16" rx="2" />
				<rect x={(a / 100) * 28 + 1} y="0" width={(b / 100) * 28 - 1} height="16" rx="2" class="secondary" />
			</svg>
		</button>
	{/each}
</div>

<style>
	.ratio-picker {
		display: flex;
		gap: 6px;
	}
	.ratio-picker button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px 4px;
		border: 1px solid #d3d6db;
		border-radius: 6px;
		background: #fff;
		cursor: pointer;
		color: #5a5f68;
	}
	.ratio-picker button svg rect {
		fill: currentColor;
	}
	.ratio-picker button svg rect.secondary {
		opacity: 0.35;
	}
	.ratio-picker button:hover:not(:disabled) {
		border-color: #0b57d0;
	}
	.ratio-picker button.active {
		border-color: #0b57d0;
		background: #f2f6fe;
		color: #0b57d0;
	}
	.ratio-picker button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
