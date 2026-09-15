<script>
	// Editing a variable's value goes through the exact same DynamicValueField/
	// ExpressionField machinery a component's field uses — pick another
	// component or variable, or build a formula, from the same "#"-triggered
	// picker, no separate static-vs-formula choice. variableAsSource() gives
	// this the element shape (type:'variable', varType, props, bindings) that
	// machinery expects, aliasing the variable's own props/bindings objects
	// rather than copying them, so every edit here IS the variable — there's
	// no draft/Save step, matching how a component's Properties panel works.
	import Icon from '../Icon.svelte';
	import DynamicValueField from './DynamicValueField.svelte';
	import { typeIcon, isVariableNameTaken, variableInCycle } from '../variables.js';
	import { variableAsSource } from '../bindings.js';

	let { variable, onclose } = $props();

	let pseudo = $derived(variableAsSource(variable));
	let nameError = $derived.by(() => {
		const trimmed = variable.name.trim();
		if (!trimmed) return 'Give it a name.';
		if (isVariableNameTaken(trimmed, variable.id)) return `"${trimmed}" is already in use.`;
		return '';
	});
	let inCycle = $derived(variableInCycle(variable.id));

	function onNameBlur() {
		variable.name = variable.name.trim();
	}

	// A plain onkeydown on the panel itself (rather than <svelte:window>) so
	// Escape only closes THIS popover when nothing inside it (the value
	// field's own reference picker, a formula popover opened from it)
	// already swallowed the key first — see ExpressionField's
	// onLiteralKeydown and FormulaPopover's onKeydown for the other half.
	function onKeydown(e) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bpop-backdrop" onclick={onclose}></div>

<div class="bpop-panel" onkeydown={onKeydown}>
	<div class="bpop-header">
		<span class="bpop-title"><Icon name={typeIcon(variable.type)} size={13} /> Variable</span>
		<button type="button" class="bpop-close" onclick={onclose}>
			<Icon name="close" size={13} />
		</button>
	</div>

	<div class="bpop-body">
		<div class="prop-field">
			<label class="prop-label" for="vp-name">Name</label>
			<input
				id="vp-name"
				class="ctrl-text"
				class:vp-input-error={!!nameError}
				type="text"
				bind:value={variable.name}
				onblur={onNameBlur}
				onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
			/>
			{#if nameError}<p class="vp-error">{nameError}</p>{/if}
		</div>

		<DynamicValueField element={pseudo} fieldKey="value" label="Value" placeholder={variable.type === 'boolean' ? 'false' : ''} />

		{#if inCycle}
			<p class="vp-warning">
				This loops back to itself through another variable — it'll read as empty until the loop is broken.
			</p>
		{/if}
	</div>
</div>

<style>
	.bpop-backdrop {
		position: absolute;
		inset: 0;
		background: transparent;
		z-index: 1000;
	}
	.bpop-panel {
		/* Docked to the LEFT sidebar (Library's tab-rail + list column,
		   60px + 300px), not the right — variables live in the Data tab
		   over there, unlike every other popover here which edits a
		   component field from the right-hand Properties panel. */
		position: absolute;
		left: 360px;
		top: 32px;
		bottom: 32px;
		width: 320px;
		max-height: 600px;
		z-index: 1001;
		background: #fff;
		border-radius: 0 12px 12px 0;
		border: 1px solid #e2e4e8;
		border-left: none;
		box-shadow: 8px 0 24px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
		height: fit-content;
	}
	.bpop-header {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid #e2e4e8;
	}
	.bpop-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.bpop-close {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #f5f5f6;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5a5f68;
		cursor: pointer;
		flex-shrink: 0;
	}
	.bpop-close:hover {
		background: #eceef1;
		color: #1a1c1e;
	}
	.bpop-body {
		padding: 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.vp-input-error {
		border-color: #b3261e;
	}
	.vp-error {
		margin: 0;
		font-size: 11px;
		color: #b3261e;
	}
	.vp-warning {
		margin: 0;
		font-size: 11px;
		line-height: 1.4;
		color: #9a5b00;
		background: #fef3e2;
		border: 1px solid #f5d9a8;
		border-radius: 6px;
		padding: 8px 10px;
	}
</style>
