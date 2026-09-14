<script>
	import { doc } from './state.svelte.js';
</script>

{#if !doc.page.footer.hidden}
	<div class="fi-footer">
		<div class="fi-footer-side">
			{#if doc.page.footer.showSecondary}
				<button type="button" class="fi-footer-btn fi-footer-btn--secondary">{doc.page.footer.secondaryLabel}</button>
			{/if}
		</div>
		<div class="fi-footer-side fi-footer-side--right">
			{#if doc.page.footer.showText}
				<button type="button" class="fi-footer-btn fi-footer-btn--text">{doc.page.footer.textLabel}</button>
			{/if}
			<button type="button" class="fi-footer-btn fi-footer-btn--primary">{doc.page.footer.primaryLabel}</button>
		</div>
	</div>
{/if}

<style>
	.fi-footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 24px;
		border-top: 1px solid var(--fi-outline, #c9cdd4);
		font-family: var(--fi-font);
		box-sizing: border-box;
	}
	.fi-footer-side {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.fi-footer-btn {
		font-family: inherit;
		font-size: 14px;
		font-weight: 500;
		padding: 10px 20px;
		border-radius: var(--fi-radius);
		cursor: pointer;
		box-sizing: border-box;
		border: none;
	}
	.fi-footer-btn--primary {
		background: var(--fi-primary);
		color: #fff;
	}
	.fi-footer-btn--secondary {
		background: transparent;
		border: 1px solid var(--fi-outline, #c9cdd4);
		color: var(--fi-on-surface, #1a1c1e);
	}
	.fi-footer-btn--text {
		background: transparent;
		border: none;
		color: var(--fi-primary);
		padding: 10px 12px;
	}
</style>
