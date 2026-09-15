<script>
	import Icon from './Icon.svelte';

	let { source, onclose } = $props();

	let previewRows = $derived(source.rows.slice(0, 10));

	function formatCell(value) {
		if (value === null || value === undefined) return '';
		if (Array.isArray(value)) return value.join(', ');
		return String(value);
	}

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dsm-overlay" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dsm-shell" onclick={(e) => e.stopPropagation()}>
		<div class="dsm-header">
			<div class="dsm-heading">
				<h2 class="dsm-title">{source.name}</h2>
				<p class="dsm-desc">{source.description}</p>
			</div>
			<button type="button" class="dsm-close" onclick={onclose}>
				<Icon name="close" size={16} />
			</button>
		</div>
		<div class="dsm-table-wrap">
			<table class="dsm-table">
				<thead>
					<tr>
						{#each source.columns as col (col)}
							<th>{col}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each previewRows as row, i (i)}
						<tr>
							{#each source.columns as col (col)}
								<td>{formatCell(row[col])}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="dsm-footer">
			<span class="dsm-footer-info">
				Showing {previewRows.length} of {source.rows.length} rows · {source.columns.length} columns
			</span>
			<div class="dsm-footer-actions">
				<button type="button" class="dsm-btn dsm-btn-cancel" onclick={onclose}>Cancel</button>
				<button type="button" class="dsm-btn dsm-btn-save" onclick={onclose}>Save</button>
			</div>
		</div>
	</div>
</div>

<style>
	.dsm-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 64px;
	}
	.dsm-shell {
		width: 100%;
		max-width: 1080px;
		max-height: 720px;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
		overflow: hidden;
		box-sizing: border-box;
		padding: 32px;
	}
	.dsm-header {
		flex-shrink: 0;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}
	.dsm-heading {
		min-width: 0;
	}
	.dsm-title {
		margin: 0 0 4px;
		font-size: 16px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.dsm-desc {
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		color: #5a5f68;
	}
	.dsm-close {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #f5f5f6;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
		cursor: pointer;
	}
	.dsm-close:hover {
		background: #eceef1;
		color: #1a1c1e;
	}
	.dsm-table-wrap {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: auto;
		border-radius: 4px 4px 0 0;
		max-height: 400px;
		border: 1px solid lightgray;
	}
	.dsm-table {
		border-collapse: collapse;
		font-size: 12px;
		white-space: nowrap;
	}
	.dsm-table th,
	.dsm-table td {
		padding: 8px 14px;
		text-align: left;
		border-bottom: 1px solid #eceef1;
	}
	.dsm-table th {
		position: sticky;
		top: 0;
		background: #fafafb;
		color: #5a5f68;
		font-weight: 600;
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		border-bottom: 1px solid #e2e4e8;
		white-space: nowrap;
		height: 40px;
	}
	.dsm-table td {
		color: #777a7e;
		font-family: 'SFMono-Regular', Consolas, monospace;
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		height: 40px;
	}
	.dsm-table tbody tr:nth-child(even) {
		background: #fafafb;
	}
	.dsm-footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 24px;
		font-size: 11px;
		color: black;
		background-color: #e1e1e2;
		border-radius: 0 0 4px 4px;
	}
	.dsm-footer-info {
		min-width: 0;
	}
	.dsm-footer-actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.dsm-btn {
		font-family: system-ui, sans-serif;
		font-size: 12px;
		font-weight: 600;
		padding: 7px 16px;
		border-radius: 6px;
		cursor: pointer;
	}
	.dsm-btn-cancel {
		background: #fff;
		color: #1a1c1e;
		border: 1px solid #c9cdd4;
	}
	.dsm-btn-cancel:hover {
		background: #f5f5f6;
	}
	.dsm-btn-save {
		background: #0b57d0;
		color: #fff;
		border: none;
	}
	.dsm-btn-save:hover {
		background: #0a4bb8;
	}
</style>
