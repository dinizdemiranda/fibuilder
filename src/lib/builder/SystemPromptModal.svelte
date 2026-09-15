<script>
	// Read-only view of the AI assistant's static system prompt — for the
	// user's own reference/debugging, not editable here (it's source code,
	// not page config). A live snapshot of the current page is appended
	// after this text before every request the assistant makes; that part
	// is intentionally left out since it's already visible via "See JSON".
	import { SYSTEM_PROMPT } from './assistant/systemPrompt.js';
	import Icon from './Icon.svelte';

	let { onclose } = $props();

	let copied = $state(false);
	let copyTimer = null;

	async function copyPrompt() {
		await navigator.clipboard.writeText(SYSTEM_PROMPT);
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
<div class="sp-overlay" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sp-shell" onclick={(e) => e.stopPropagation()}>
		<div class="sp-header">
			<h2 class="sp-title">Assistant system prompt</h2>
			<div class="sp-header-actions">
				<button type="button" class="sp-copy-btn" onclick={copyPrompt}>
					<Icon name={copied ? 'check' : 'copy'} size={13} />
					{copied ? 'Copied' : 'Copy'}
				</button>
				<button type="button" class="sp-close" onclick={onclose}>
					<Icon name="close" size={15} />
				</button>
			</div>
		</div>
		<p class="sp-note">
			This is the fixed instructions the AI Assistant tab is given, read-only. Before every request it also gets a
			fresh text snapshot of the current page (element tree, variables, data sources) appended after this — see
			"See JSON" for the equivalent full page state.
		</p>
		<div class="sp-body"><pre>{SYSTEM_PROMPT}</pre></div>
	</div>
</div>

<style>
	.sp-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 32px;
	}
	.sp-shell {
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
	.sp-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.sp-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}
	.sp-header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.sp-copy-btn {
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
	.sp-copy-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.sp-close {
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
	.sp-close:hover {
		background: rgba(255, 255, 255, 0.16);
		color: #fff;
	}
	.sp-note {
		flex-shrink: 0;
		margin: 0;
		padding: 12px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 11.5px;
		line-height: 1.5;
		color: #9aa0a8;
	}
	.sp-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 16px 20px;
	}
	.sp-body pre {
		margin: 0;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 12px;
		line-height: 1.6;
		color: #d3d6db;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
