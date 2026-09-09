<script>
	import Icon from '../Icon.svelte';
	import BindingPopover from './BindingPopover.svelte';
	import ExpressionField from './ExpressionField.svelte';
	import { getFieldType, describeCondition } from '../bindings.js';

	let { element, fieldKey, label, placeholder = '', multiline = false } = $props();

	// svelte-ignore state_referenced_locally -- element/fieldKey are fixed for this instance's lifetime
	const fieldType = getFieldType(element.type, fieldKey);
	const isBoolean = fieldType === 'boolean';

	let popoverOpen = $state(false);
	let binding = $derived(element.bindings?.[fieldKey]);
	let hasCondition = $derived(binding?.kind === 'condition');
	let summaryText = $derived(describeCondition(element, fieldKey));
</script>

<div class="prop-field">
	<div class="prop-label-row">
		<span class="prop-label">{label}</span>
		<button
			type="button"
			class="fx-btn"
			class:active={hasCondition}
			data-tooltip={hasCondition ? 'Condition set — click to edit' : 'Set a condition'}
			onclick={() => (popoverOpen = !popoverOpen)}
		>
			<Icon name="bolt" size={12} />
		</button>
	</div>

	{#if hasCondition}
		<button type="button" class="cond-summary" onclick={() => (popoverOpen = true)}>{summaryText}</button>
	{:else if isBoolean}
		<input class="ctrl-text" type="text" placeholder={placeholder || 'false'} bind:value={element.props[fieldKey]} />
	{:else}
		<ExpressionField {element} {fieldKey} {fieldType} {placeholder} {multiline} />
	{/if}
</div>

{#if popoverOpen}
	<BindingPopover {element} {fieldKey} {label} onclose={() => (popoverOpen = false)} />
{/if}

<style>
	.fx-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 5px;
		border: 1px solid #d3d6db;
		background: #fff;
		color: #8a8f98;
		cursor: pointer;
		padding: 0;
	}
	.fx-btn:hover {
		border-color: #0b57d0;
		color: #0b57d0;
	}
	.fx-btn.active {
		background: #0b57d0;
		border-color: #0b57d0;
		color: #fff;
	}
	.cond-summary {
		width: 100%;
		text-align: left;
		padding: 8px 10px;
		border: 1px solid #d9c7f5;
		border-radius: 6px;
		background: #f4edfc;
		color: #6b3fa0;
		font-family: system-ui, sans-serif;
		font-size: 12.5px;
		font-weight: 500;
		line-height: 1.4;
		cursor: pointer;
	}
	.cond-summary:hover {
		border-color: #b98af0;
		background: #efe3fb;
	}
</style>
