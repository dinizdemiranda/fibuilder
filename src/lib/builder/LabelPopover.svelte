<script>
	import LabelCanvas from './LabelCanvas.svelte';
	import Icon from './Icon.svelte';
	import { sortedDataFields, isRequiredField } from './labels.js';

	let { label, onclose } = $props();

	let fields = $derived(sortedDataFields(label));

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lpop-backdrop" onclick={onclose}></div>

<div class="lpop-panel">
	<button type="button" class="lpop-close" onclick={onclose} data-tooltip="Close">
		<Icon name="close" size={14} />
	</button>
	<div class="lpop-preview">
		<LabelCanvas {label} />
	</div>
	<h3 class="lpop-name">{label.name}</h3>
	<p class="lpop-desc">{label.description}</p>
	<div class="lpop-divider"></div>
	<div class="lpop-fields-section">
		<div class="lpop-fields-heading">Data fields</div>
		<div class="lpop-fields-scroll">
			<ul class="lpop-fields">
				{#each fields as field (field.name)}
					<li>
						<span class="lpop-field-left">
							<span class="lpop-field-name">{field.name}</span>
							{#if isRequiredField(label, field.name)}
								<span class="lpop-field-required">Required</span>
							{/if}
						</span>
						<span class="lpop-field-type">{field.data_type}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>

<style>
	/* Stops short of the sidebar (which ends at 360px, same offset the panel
	   itself sits at) so clicking a different label card there closes this
	   popover AND opens the new one in the same click, instead of the
	   backdrop swallowing that first click just to close this one. */
	.lpop-backdrop {
		position: fixed;
		top: 0;
		left: 360px;
		right: 0;
		bottom: 0;
		background: transparent;
		z-index: 1000;
	}
	.lpop-panel {
		position: absolute;
		left: 360px;
		top: 32px;
		width: 320px;
		height: fit-content;
		max-height: calc(100vh - 116px);
		z-index: 1001;
		background: #fff;
		border-radius: 0 12px 12px 0;
		border: 1px solid #e2e4e8;
		border-left: none;
		box-sizing: border-box;
		padding: 20px;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
	}
	.lpop-close {
		position: absolute;
		top: 14px;
		right: 14px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #1a1c1e;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		transition: all 0.1s;
	}
	.lpop-close:hover {
		background: #1a1c1e;
		color: white;
		transform: scale(0.95);
	}
	.lpop-preview {
		flex-shrink: 0;
		height: 180px;
		background: #f1f2f4;
		border: 1px solid #c9cdd4;
		border-radius: 8px;
		box-sizing: border-box;
		padding: 12px;
		margin-bottom: 16px;
	}
	.lpop-name {
		flex-shrink: 0;
		margin: 0 0 6px;
		font-size: 14px;
		font-weight: 600;
		color: #1a1c1e;
		padding-right: 24px;
	}
	.lpop-desc {
		flex-shrink: 0;
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		color: #5a5f68;
	}
	.lpop-divider {
		flex-shrink: 0;
		height: 1px;
		background: #e2e4e8;
		margin: 16px 0;
	}
	.lpop-fields-section {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.lpop-fields-heading {
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #8a8f98;
		margin-bottom: 8px;
	}
	.lpop-fields-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		border: 1px solid #e2e4e8;
		border-radius: 6px;
	}
	.lpop-fields {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		overflow: hidden;
	}
	.lpop-fields li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 7px 10px;
		background: #fff;
		font-size: 12px;
	}
	.lpop-fields li:nth-child(even) {
		background: #fafafb;
	}
	.lpop-field-name {
		min-width: 0;
		color: #1a1c1e;
		font-family: 'SFMono-Regular', Consolas, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.lpop-field-type {
		flex-shrink: 0;
		color: #8a8f98;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.lpop-field-left {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.lpop-field-required {
		flex-shrink: 0;
		background: #e8f0fe;
		color: #0b57d0;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 2px 6px;
		border-radius: 4px;
	}
</style>
