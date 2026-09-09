<script>
	import { blockDefs } from '../types.js';
	import { renameElement, isNameTaken } from '../state.svelte.js';
	import Icon from '../Icon.svelte';

	let { element } = $props();

	let editing = $state(false);
	// svelte-ignore state_referenced_locally -- seeds initial value only; the effect below resyncs on every selection change
	let draft = $state(element.name);
	let error = $state('');
	let inputEl = $state();

	// Resyncs whenever the selection changes to a different element, or after
	// a successful rename changes element.name — both read element.name.
	$effect(() => {
		draft = element.name;
		error = '';
		editing = false;
	});

	$effect(() => {
		if (editing && inputEl) {
			inputEl.focus();
			inputEl.select();
		}
	});

	function startEdit() {
		draft = element.name;
		error = '';
		editing = true;
	}

	function commit() {
		const trimmed = draft.trim();
		if (!trimmed || trimmed === element.name) {
			draft = element.name;
			error = '';
			editing = false;
			return;
		}
		if (isNameTaken(trimmed, element.id)) {
			error = `"${trimmed}" is already in use.`;
			return;
		}
		renameElement(element.id, trimmed);
		error = '';
		editing = false;
	}

	function cancel() {
		draft = element.name;
		error = '';
		editing = false;
	}
</script>

<div class="el-identity-wrap">
	<div class="el-identity">
		<span class="el-identity-icon"><Icon name={blockDefs[element.type]?.icon ?? 'text'} size={16} /></span>
		{#if editing}
			<input
				bind:this={inputEl}
				class="el-identity-input"
				class:has-error={!!error}
				type="text"
				bind:value={draft}
				onblur={commit}
				onkeydown={(e) => {
					if (e.key === 'Enter') commit();
					if (e.key === 'Escape') cancel();
				}}
			/>
		{:else}
			<button type="button" class="el-identity-name" onclick={startEdit} data-tooltip="Click to rename">
				{element.name}
			</button>
		{/if}
	</div>
	{#if error}
		<div class="el-identity-error">{error}</div>
	{/if}
</div>

<style>
	.el-identity-wrap {
		flex: 1;
		min-width: 0;
	}
	.el-identity {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.el-identity-icon {
		flex-shrink: 0;
		display: flex;
		color: #5a5f68;
	}
	.el-identity-name {
		flex: 1;
		min-width: 0;
		text-align: left;
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 3px 6px;
		margin-left: -6px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 600;
		color: #1a1c1e;
		cursor: text;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.el-identity-name:hover {
		background: #eceef1;
		border-color: #d3d6db;
	}
	.el-identity-input {
		flex: 1;
		min-width: 0;
		font-family: inherit;
		font-size: 13px;
		font-weight: 600;
		color: #1a1c1e;
		padding: 3px 6px;
		margin-left: -6px;
		border: 1px solid #0b57d0;
		border-radius: 4px;
		background: #fff;
		outline: none;
	}
	.el-identity-input.has-error {
		border-color: #b3261e;
	}
	.el-identity-error {
		font-size: 11px;
		color: #b3261e;
		margin-top: 3px;
	}
</style>
