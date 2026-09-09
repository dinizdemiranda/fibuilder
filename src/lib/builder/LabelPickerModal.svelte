<script>
	import { doc, setLabels } from './state.svelte.js';
	import { labelDefinitions, sortedDataFields, isRequiredField, getLabelThumbnail } from './labels.js';
	import LabelCanvas from './LabelCanvas.svelte';
	import Icon from './Icon.svelte';

	let { onclose } = $props();

	let previewId = $state(labelDefinitions[0]?.id ?? null);
	// svelte-ignore state_referenced_locally -- seeded once from the current imports; the picker doesn't track later changes to doc.labels
	const initialIds = new Set(doc.labels);
	let checkedIds = $state(new Set(doc.labels));

	let previewLabel = $derived(labelDefinitions.find((l) => l.id === previewId) ?? null);
	let previewFields = $derived(previewLabel ? sortedDataFields(previewLabel) : []);
	let isDirty = $derived(!setsEqual(checkedIds, initialIds));
	let ctaLabel = $derived(isDirty ? 'Update' : 'Import');

	function setsEqual(a, b) {
		if (a.size !== b.size) return false;
		for (const v of a) if (!b.has(v)) return false;
		return true;
	}

	function selectPreview(id) {
		previewId = id;
	}

	function toggleChecked(e, id) {
		e.stopPropagation();
		const next = new Set(checkedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		checkedIds = next;
	}

	function confirm() {
		if (!isDirty) return;
		const ordered = labelDefinitions.filter((l) => checkedIds.has(l.id)).map((l) => l.id);
		setLabels(ordered);
		onclose();
	}

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lp-overlay" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="lp-shell" onclick={(e) => e.stopPropagation()}>
		<div class="lp-title-bar">
			<h2 class="lp-title">Import Labels</h2>
		</div>
		<div class="lp-body">
			<div class="lp-preview">
				{#if previewLabel}
					<LabelCanvas label={previewLabel} />
				{/if}
			</div>
			<div class="lp-details">
				{#if previewLabel}
					<h3 class="lp-details-name">{previewLabel.name}</h3>
					<p class="lp-details-desc">{previewLabel.description}</p>
					<div class="lp-fields-section">
						<div class="lp-details-heading">Data fields</div>
						<div class="lp-fields-scroll">
							<ul class="lp-fields">
								{#each previewFields as field (field.name)}
									<li>
										<span class="lp-field-left">
											<span class="lp-field-name">{field.name}</span>
											{#if isRequiredField(previewLabel, field.name)}
												<span class="lp-field-required">Required</span>
											{/if}
										</span>
										<span class="lp-field-type">{field.data_type}</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}
			</div>
		</div>
		<div class="lp-thumbs">
			{#each labelDefinitions as label (label.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="lp-item"
					class:active={previewId === label.id}
					onclick={() => selectPreview(label.id)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && selectPreview(label.id)}
				>
					<span class="lp-thumb">
						<span class="lp-thumb-image">
							{#if getLabelThumbnail(label.id)}
								<img src={getLabelThumbnail(label.id)} alt={label.name} />
							{:else}
								<Icon name="label" size={24} />
							{/if}
						</span>
						<button
							type="button"
							class="lp-check"
							class:checked={checkedIds.has(label.id)}
							onclick={(e) => toggleChecked(e, label.id)}
							data-tooltip={checkedIds.has(label.id) ? 'Selected for import' : 'Select for import'}
						>
							{#if checkedIds.has(label.id)}
								<Icon name="check" size={11} />
							{/if}
						</button>
					</span>
					<span class="lp-name">{label.name}</span>
				</div>
			{/each}
		</div>
		<div class="lp-footer">
			<button type="button" class="lp-btn lp-btn--secondary" onclick={onclose}>Cancel</button>
			<button type="button" class="lp-btn lp-btn--primary" disabled={!isDirty} onclick={confirm}>
				{ctaLabel}
			</button>
		</div>
	</div>
</div>

<style>
	.lp-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 32px;
	}
	.lp-shell {
		width: 100%;
		max-width: 980px;
		height: 100%;
		max-height: 760px;
		background: #fff;
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		font-family: system-ui, sans-serif;
	}
	.lp-title-bar {
		flex-shrink: 0;
		padding: 18px 20px 12px;
		border-bottom: 1px solid #e2e4e8;
	}
	.lp-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.lp-body {
		flex: 1;
		min-height: 0;
		display: flex;
		gap: 16px;
		padding: 16px;
		box-sizing: border-box;
	}
	.lp-preview {
		flex: 1.1;
		min-width: 0;
		background: #f1f2f4;
		border: 1px solid #c9cdd4;
		border-radius: 8px;
		padding: 24px;
		box-sizing: border-box;
	}
	.lp-details {
		flex: 1;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding-right: 4px;
	}
	.lp-details-name {
		flex-shrink: 0;
		margin: 0 0 8px;
		font-size: 15px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.lp-details-desc {
		flex-shrink: 0;
		margin: 0 0 18px;
		font-size: 13px;
		line-height: 1.5;
		color: #5a5f68;
	}
	.lp-fields-section {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.lp-details-heading {
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #8a8f98;
		margin-bottom: 8px;
	}
	.lp-fields-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
	.lp-fields {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		border: 1px solid #e2e4e8;
		border-radius: 6px;
		overflow: hidden;
	}
	.lp-fields li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 7px 10px;
		background: #fff;
		font-size: 12px;
	}
	.lp-fields li:nth-child(even) {
		background: #fafafb;
	}
	.lp-field-name {
		min-width: 0;
		color: #1a1c1e;
		font-family: 'SFMono-Regular', Consolas, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.lp-field-type {
		flex-shrink: 0;
		color: #8a8f98;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.lp-field-left {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.lp-field-required {
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
	.lp-thumbs {
		flex-shrink: 0;
		display: flex;
		gap: 14px;
		padding: 16px;
		overflow-x: auto;
		border-top: 1px solid #e2e4e8;
	}
	.lp-item {
		flex-shrink: 0;
		width: 84px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		background: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
		padding: 0;
	}
	.lp-thumb {
		position: relative;
		width: 72px;
		height: 72px;
		box-sizing: border-box;
	}
	/* Clips the artwork to the rounded box; kept separate from .lp-thumb
	   itself (which stays overflow:visible) so the checkmark badge below can
	   still hang half outside the corner without getting clipped too. */
	.lp-thumb-image {
		width: 100%;
		height: 100%;
		border-radius: 10px;
		background: #eceef1;
		border: 1px solid #e2e4e8;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
		box-sizing: border-box;
		overflow: hidden;
	}
	.lp-thumb img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 5px;
		box-sizing: border-box;
	}
	.lp-item.active .lp-thumb-image {
		border-color: #0b57d0;
		background: #f2f6fe;
		color: #0b57d0;
		box-shadow: 0 0 0 2px rgba(11, 87, 208, 0.25);
	}
	.lp-name {
		font-size: 11px;
		color: #2b2e33;
		text-align: center;
		line-height: 1.25;
	}
	.lp-check {
		position: absolute;
		bottom: -6px;
		right: -6px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		border: 1.5px solid #c9cdd4;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		cursor: pointer;
		padding: 0;
	}
	.lp-check:hover {
		border-color: #0b57d0;
	}
	.lp-check.checked {
		background: #0b57d0;
		border-color: #0b57d0;
	}
	.lp-footer {
		flex-shrink: 0;
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 14px 16px;
		border-top: 1px solid #e2e4e8;
	}
	.lp-btn {
		font-family: inherit;
		font-size: 13px;
		font-weight: 600;
		padding: 9px 18px;
		border-radius: 6px;
		cursor: pointer;
		box-sizing: border-box;
	}
	.lp-btn--secondary {
		background: #fff;
		border: 1px solid #d3d6db;
		color: #1a1c1e;
	}
	.lp-btn--secondary:hover {
		background: #f5f5f6;
	}
	.lp-btn--primary {
		background: #0b57d0;
		border: none;
		color: #fff;
	}
	.lp-btn--primary:hover:not(:disabled) {
		background: #0a4bb8;
	}
	.lp-btn--primary:disabled {
		background: #c9cdd4;
		cursor: not-allowed;
	}
</style>
