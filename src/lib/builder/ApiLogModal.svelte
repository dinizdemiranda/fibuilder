<script>
	// Every response the OpenAI API has sent back this session, newest
	// first — separate from AssistantPanel's own rendered chat, and visible
	// from the top menu regardless of which sidebar tab is open. See
	// assistant/apiLog.svelte.js for where entries get logged.
	import { apiLog } from './assistant/apiLog.svelte.js';
	import Icon from './Icon.svelte';

	let { onclose } = $props();

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}

	function formatTime(ts) {
		return new Date(ts).toLocaleTimeString([], { hour12: false });
	}

	function summaryLine(entry) {
		if (entry.error) return `Error — ${entry.error}`;
		if (entry.toolCalls?.length) return entry.toolCalls.map((tc) => tc.name).join(', ');
		if (entry.text) return entry.text.length > 90 ? `${entry.text.slice(0, 90)}…` : entry.text;
		return '(empty response)';
	}

	function toggle(entry) {
		entry.expanded = !entry.expanded;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="al-overlay" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="al-shell" onclick={(e) => e.stopPropagation()}>
		<div class="al-header">
			<h2 class="al-title">AI responses <span class="al-count">({apiLog.entries.length})</span></h2>
			<button type="button" class="al-close" onclick={onclose}>
				<Icon name="close" size={15} />
			</button>
		</div>
		<div class="al-body">
			{#if apiLog.entries.length === 0}
				<div class="al-empty">No API responses logged yet this session — they'll appear here as the AI Assistant tab is used.</div>
			{:else}
			<div class="al-list">
				{#each apiLog.entries as entry (entry.id)}
					<div class="al-entry" class:al-entry--error={!!entry.error}>
						<button type="button" class="al-entry-row" onclick={() => toggle(entry)}>
							<span class="al-chevron" class:al-chevron--open={entry.expanded}>
								<Icon name="chevronDown" size={11} />
							</span>
							<span class="al-time">{formatTime(entry.timestamp)}</span>
							<span class="al-summary">{summaryLine(entry)}</span>
							<span class="al-tokens">{entry.usage?.total_tokens != null ? `${entry.usage.total_tokens.toLocaleString()} tok` : '—'}</span>
						</button>
						{#if entry.expanded}
							<pre class="al-json">{JSON.stringify({ ...entry, expanded: undefined }, null, 2)}</pre>
						{/if}
					</div>
				{/each}
			</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.al-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 32px;
	}
	.al-shell {
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
	.al-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	.al-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}
	.al-count {
		font-weight: 400;
		color: #9aa0a8;
	}
	.al-close {
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
	.al-close:hover {
		background: rgba(255, 255, 255, 0.16);
		color: #fff;
	}
	.al-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 10px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.al-empty {
		margin: auto;
		text-align: center;
		color: #7a8087;
		font-size: 12.5px;
		padding: 24px;
	}
	.al-list {

		
	}
	.al-entry {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		overflow: hidden;
	}
	.al-entry--error {
		border-color: rgba(211, 68, 55, 0.4);
	}
	.al-entry-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 10px;
		border: none;
		background: rgba(255, 255, 255, 0.03);
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}
	.al-entry-row:hover {
		background: rgba(255, 255, 255, 0.07);
	}
	.al-chevron {
		flex-shrink: 0;
		display: flex;
		color: #7a8087;
		transform: rotate(-90deg);
		transition: transform 0.12s ease;
	}
	.al-chevron--open {
		transform: rotate(0deg);
	}
	.al-time {
		flex-shrink: 0;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 11px;
		color: #9aa0a8;
	}
	.al-summary {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		color: #d3d6db;
	}
	.al-entry--error .al-summary {
		color: #f0a49c;
	}
	.al-tokens {
		flex-shrink: 0;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 11px;
		color: #7a8087;
	}
	.al-json {
		margin: 0;
		padding: 10px 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 11px;
		line-height: 1.5;
		color: #d3d6db;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 300px;
		overflow-y: auto;
	}
</style>
