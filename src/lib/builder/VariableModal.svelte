<script>
	import Icon from './Icon.svelte';
	import Switch from './properties/Switch.svelte';
	import { uniqueVariableName, isVariableNameTaken, createVariable, defaultValueFor } from './variables.js';
	import { NOW_SENTINEL } from './bindings.js';

	let { type, variable, onclose } = $props();
	// svelte-ignore state_referenced_locally -- variable/type are fixed for this modal's lifetime (it's remounted fresh each time it opens)
	const isNew = !variable;
	// svelte-ignore state_referenced_locally -- same as above
	const varType = variable?.type ?? type;

	// svelte-ignore state_referenced_locally -- seeds the draft once when this modal mounts
	let draftName = $state(variable?.name ?? uniqueVariableName('Variable'));
	// svelte-ignore state_referenced_locally -- same as above
	let draftDefault = $state(variable?.defaultValue ?? defaultValueFor(varType));
	let error = $state('');

	function save() {
		const trimmed = draftName.trim();
		if (!trimmed) {
			error = 'Give it a name.';
			return;
		}
		if (isVariableNameTaken(trimmed, variable?.id ?? null)) {
			error = `"${trimmed}" is already in use.`;
			return;
		}
		if (isNew) {
			createVariable({ name: trimmed, type: varType, defaultValue: draftDefault });
		} else {
			variable.name = trimmed;
			variable.defaultValue = draftDefault;
		}
		onclose();
	}

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="vm-overlay" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="vm-shell" onclick={(e) => e.stopPropagation()}>
		<div class="vm-header">
			<h2 class="vm-title">{isNew ? 'Add Variable' : 'Edit Variable'}</h2>
			<button type="button" class="vm-close" onclick={onclose} data-tooltip="Close">
				<Icon name="close" size={15} />
			</button>
		</div>
		<div class="vm-body">
			<div class="prop-field">
				<label class="prop-label" for="vm-name">Name</label>
				<input
					id="vm-name"
					class="ctrl-text"
					class:vm-input-error={!!error}
					type="text"
					bind:value={draftName}
					onkeydown={(e) => e.key === 'Enter' && save()}
				/>
				{#if error}<p class="vm-error">{error}</p>{/if}
			</div>
			<div class="prop-field">
				<span class="prop-label">Default value</span>
				{#if varType === 'boolean'}
					<Switch
						checked={draftDefault === 'true'}
						onchange={(e) => (draftDefault = e.currentTarget.checked ? 'true' : 'false')}
					/>
				{:else if varType === 'date'}
					<div class="vm-date-default">
						<label class="ctrl-checkbox-row">
							<input
								type="checkbox"
								checked={draftDefault === NOW_SENTINEL}
								onchange={(e) => (draftDefault = e.currentTarget.checked ? NOW_SENTINEL : '')}
							/>
							Always use current time
						</label>
						{#if draftDefault !== NOW_SENTINEL}
							<input class="ctrl-text" type="date" bind:value={draftDefault} />
						{/if}
					</div>
				{:else if varType === 'number'}
					<input class="ctrl-text" type="number" bind:value={draftDefault} />
				{:else}
					<input class="ctrl-text" type="text" bind:value={draftDefault} />
				{/if}
			</div>
		</div>
		<div class="vm-footer">
			<button type="button" class="vm-btn vm-btn-cancel" onclick={onclose}>Cancel</button>
			<button type="button" class="vm-btn vm-btn-save" onclick={save}>{isNew ? 'Create' : 'Save'}</button>
		</div>
	</div>
</div>

<style>
	.vm-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 32px;
	}
	.vm-shell {
		width: 100%;
		max-width: 360px;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		box-sizing: border-box;
		font-family: system-ui, sans-serif;
		overflow: hidden;
	}
	.vm-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #e2e4e8;
	}
	.vm-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.vm-close {
		width: 26px;
		height: 26px;
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
	.vm-close:hover {
		background: #eceef1;
		color: #1a1c1e;
	}
	.vm-body {
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.vm-input-error {
		border-color: #b3261e;
	}
	.vm-date-default {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}
	.vm-error {
		margin: 0;
		font-size: 11px;
		color: #b3261e;
	}
	.vm-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding: 14px 20px;
		border-top: 1px solid #e2e4e8;
		background: #fafafb;
	}
	.vm-btn {
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 8px 18px;
		border-radius: 6px;
		cursor: pointer;
	}
	.vm-btn-cancel {
		background: #fff;
		color: #1a1c1e;
		border: 1px solid #c9cdd4;
	}
	.vm-btn-cancel:hover {
		background: #f5f5f6;
	}
	.vm-btn-save {
		background: #0b57d0;
		color: #fff;
		border: none;
	}
	.vm-btn-save:hover {
		background: #0a4bb8;
	}
</style>
