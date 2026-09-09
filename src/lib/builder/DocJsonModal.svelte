<script>
	import { doc } from './state.svelte.js';
	import Icon from './Icon.svelte';
	import JsonTree from './JsonTree.svelte';

	let { onclose } = $props();

	// Copy always hands over the complete data regardless of what's collapsed
	// in the tree view — $derived (not a one-off snapshot) so it stays
	// accurate if doc changes while this modal is open, same live-read
	// approach as PreviewModal's own payload.
	let jsonText = $derived(JSON.stringify(doc, null, 2));

	let copied = $state(false);
	let copyTimer = null;

	async function copyJson() {
		await navigator.clipboard.writeText(jsonText);
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 1500);
	}

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dj-overlay" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dj-shell" onclick={(e) => e.stopPropagation()}>
		<div class="dj-header">
			<h2 class="dj-title">Page JSON</h2>
			<div class="dj-header-actions">
				<button type="button" class="dj-copy-btn" onclick={copyJson}>
					<Icon name={copied ? 'check' : 'copy'} size={13} />
					{copied ? 'Copied' : 'Copy'}
				</button>
				<button type="button" class="dj-close" onclick={onclose}>
					<Icon name="close" size={15} />
				</button>
			</div>
		</div>
		<div class="dj-body">
			<JsonTree value={doc} />
		</div>
	</div>
</div>

<style>
	.dj-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 32px;
	}
	.dj-shell {
		width: 100%;
		max-width: 720px;
		height: 100%;
		max-height: 640px;
		background: #282c34;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		box-sizing: border-box;
		font-family: system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.dj-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.dj-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}
	.dj-header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.dj-copy-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 10px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.06);
		color: #d3d6db;
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}
	.dj-copy-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.dj-close {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #d3d6db;
		cursor: pointer;
		flex-shrink: 0;
	}
	.dj-close:hover {
		background: rgba(255, 255, 255, 0.16);
		color: #fff;
	}
	.dj-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 16px 20px;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 12.5px;
		line-height: 1.6;
	}
</style>
