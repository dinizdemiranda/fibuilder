<script>
	// A formula's code is a plain single-line JS expression, e.g.
	// `quantity * price` or `total > 100 ? 'Free' : 'Standard'`, run through
	// runFormulaCode (formulas.js) with each entry in `refs` bound as a
	// parameter named by its key. This popover is the only place refs/code
	// get authored — it's a plain <input>, which structurally can't hold a
	// newline, so "one line only" is enforced by the editor itself.
	import Icon from '../Icon.svelte';
	import { blockDefs } from '../types.js';
	import { sanitizeIdentifier, coerceFormulaResult } from '../formulas.js';
	import { previewFormula } from '../bindings.js';

	let { candidates, initialFormula = null, resultType = null, onsave, oncancel } = $props();

	// svelte-ignore state_referenced_locally -- seeds the draft once when this popover mounts (it's remounted fresh each time it opens, per the {#if formulaPopoverOpen} pattern its callers use)
	let code = $state(initialFormula?.code ?? '');
	// svelte-ignore state_referenced_locally -- same as above
	let refs = $state({ ...(initialFormula?.refs ?? {}) });
	let saveError = $state('');
	let menuOpen = $state(false);
	let codeEl = $state(null);
	let codeRowEl = $state(null);

	let componentCandidates = $derived(candidates.filter((c) => c.type !== 'variable' && c.type !== 'method'));
	let variableCandidates = $derived(candidates.filter((c) => c.type === 'variable'));
	let methodCandidates = $derived(candidates.filter((c) => c.type === 'method'));
	let refEntries = $derived(Object.entries(refs));

	let preview = $derived.by(() => (code.trim() ? previewFormula(refs, code) : { ok: true, value: '' }));

	function insertReference(src) {
		const identifier = sanitizeIdentifier(src.name, Object.keys(refs));
		refs[identifier] = src.id;
		const start = codeEl?.selectionStart ?? code.length;
		const end = codeEl?.selectionEnd ?? code.length;
		code = code.slice(0, start) + identifier + code.slice(end);
		menuOpen = false;
		const pos = start + identifier.length;
		queueMicrotask(() => {
			codeEl?.focus();
			codeEl?.setSelectionRange(pos, pos);
		});
	}

	// Typing "#" opens the same reference picker other value fields use
	// (ExpressionField's literal inputs) — consumed rather than left in the
	// code, same mention-style trigger.
	function onCodeInput(e) {
		const el = e.currentTarget;
		const pos = el.selectionStart ?? el.value.length;
		if (pos > 0 && el.value[pos - 1] === '#') {
			const value = el.value.slice(0, pos - 1) + el.value.slice(pos);
			// See ExpressionField's onLiteralInput for why this needs an
			// imperative write too: stripping "#" can land back on the same
			// string the reactive `code` already held, which Svelte's own
			// diffing would then treat as a no-op and leave the raw "#"
			// sitting in the DOM.
			el.value = value;
			el.setSelectionRange(pos - 1, pos - 1);
			code = value;
			menuOpen = true;
			return;
		}
		code = el.value;
	}

	function removeRef(name) {
		delete refs[name];
	}

	// Closes the reference menu on a click outside the code row — a plain
	// containment check rather than a full-viewport intercepting backdrop,
	// which used to sit on top of the code input itself and swallow every
	// click meant to just move the cursor to a specific spot before
	// inserting a reference there (see ExpressionField's identical fix).
	function onWindowMousedown(e) {
		if (menuOpen && codeRowEl && !codeRowEl.contains(e.target)) menuOpen = false;
	}

	function save() {
		saveError = '';
		if (!code.trim()) {
			saveError = 'Enter a formula.';
			return;
		}
		if (!preview.ok) {
			saveError = preview.error || 'This formula has an error.';
			return;
		}
		if (resultType) {
			const coerced = coerceFormulaResult(resultType, preview.value);
			if (!coerced.ok) {
				saveError = `That result doesn't match this variable's type.`;
				return;
			}
		}
		onsave({ code: code.trim(), refs: { ...refs } });
	}

	// A plain onkeydown on the popover's own root (rather than
	// <svelte:window>) so Escape only closes THIS popover when it actually
	// bubbles up from inside it — and, since it's a normal DOM listener,
	// stopping it here also keeps it from reaching an ancestor popover's
	// own window-level Escape handler when this is opened from inside one
	// (e.g. a formula created from a variable's value field).
	function onKeydown(e) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			oncancel();
		}
	}
</script>

<svelte:window onmousedown={onWindowMousedown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fp-overlay" onclick={oncancel} onkeydown={onKeydown}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fp-shell" onclick={(e) => e.stopPropagation()}>
		<div class="fp-header">
			<h3 class="fp-title">Formula</h3>
			<button type="button" class="fp-close" onclick={oncancel}>
				<Icon name="close" size={14} />
			</button>
		</div>
		<div class="fp-body">
			<div class="fp-field">
				<label class="fp-label" for="fp-code">Formula</label>
				<div class="fp-code-row" bind:this={codeRowEl}>
					<input
						id="fp-code"
						class="fp-code"
						type="text"
						bind:this={codeEl}
						value={code}
						placeholder="e.g. quantity * price — type # to reference a field"
						oninput={onCodeInput}
						onkeydown={(e) => {
							if (e.key === 'Enter') save();
							else if (e.key === 'Escape' && menuOpen) {
								e.stopPropagation();
								menuOpen = false;
							}
						}}
					/>
					{#if menuOpen}
						<div class="fp-menu">
							{#if candidates.length === 0}
								<div class="fp-menu-empty">No other fields to reference yet.</div>
							{:else}
								{#if componentCandidates.length}
									<div class="fp-menu-heading">Components</div>
									{#each componentCandidates as src (src.id)}
										<button type="button" onclick={() => insertReference(src)}>
											<Icon name={blockDefs[src.type]?.icon ?? 'text'} size={13} />
											{src.name}
										</button>
									{/each}
								{/if}
								{#if variableCandidates.length}
									<div class="fp-menu-heading">Variables</div>
									{#each variableCandidates as src (src.id)}
										<button type="button" onclick={() => insertReference(src)}>
											<Icon name="variable" size={13} />
											{src.name}
										</button>
									{/each}
								{/if}
								{#if methodCandidates.length}
									<div class="fp-menu-heading">Methods</div>
									{#each methodCandidates as src (src.id)}
										<button type="button" onclick={() => insertReference(src)}>
											<Icon name="clock" size={13} />
											{src.name}
										</button>
									{/each}
								{/if}
							{/if}
						</div>
					{/if}
				</div>
				<p class="fp-hint">Simple math or a single-line JS expression — ternaries, string/number formatting, etc. Type # to reference a field.</p>
			</div>

			{#if refEntries.length}
				<div class="fp-refs">
					{#each refEntries as [name, srcId] (name)}
						{@const src = candidates.find((c) => c.id === srcId)}
						<div class="fp-ref-row">
							<code class="fp-ref-name">{name}</code>
							<span class="fp-ref-arrow">=</span>
							<span class="fp-ref-src">{src?.name ?? 'Deleted field'}</span>
							<button type="button" class="fp-ref-remove" onclick={() => removeRef(name)} data-tooltip="Remove">×</button>
						</div>
					{/each}
				</div>
			{/if}

			<div class="fp-preview" class:fp-preview-error={!preview.ok}>
				{#if !preview.ok}
					Error: {preview.error}
				{:else}
					Preview: {preview.value === '' ? '(empty)' : String(preview.value)}
				{/if}
			</div>
			{#if saveError}<p class="fp-error">{saveError}</p>{/if}
		</div>
		<div class="fp-footer">
			<button type="button" class="fp-btn fp-btn-cancel" onclick={oncancel}>Cancel</button>
			<button type="button" class="fp-btn fp-btn-save" onclick={save}>Save</button>
		</div>
	</div>
</div>

<style>
	.fp-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
		padding: 32px;
	}
	.fp-shell {
		width: 100%;
		max-width: 420px;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		box-sizing: border-box;
		font-family: system-ui, sans-serif;
	}
	.fp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #e2e4e8;
	}
	.fp-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.fp-close {
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
	.fp-close:hover {
		background: #eceef1;
		color: #1a1c1e;
	}
	.fp-body {
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.fp-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.fp-label {
		font-size: 12px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.fp-code-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.fp-code {
		flex: 1;
		min-width: 0;
		border: 1px solid #d3d6db;
		border-radius: 6px;
		padding: 8px 10px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 13px;
		color: #1a1c1e;
		box-sizing: border-box;
	}
	.fp-code:focus {
		outline: none;
		border-color: #0b57d0;
	}
	.fp-hint {
		margin: 0;
		font-size: 11px;
		color: #8a8f98;
	}
	.fp-menu {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		min-width: 190px;
		max-height: 220px;
		overflow-y: auto;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
		z-index: 20;
		padding: 4px;
	}
	.fp-menu-heading {
		padding: 6px 8px 2px;
		font-family: system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8a8f98;
	}
	.fp-menu button {
		display: flex;
		align-items: center;
		gap: 7px;
		width: 100%;
		text-align: left;
		padding: 7px 8px;
		border: none;
		background: none;
		border-radius: 5px;
		font-family: system-ui, sans-serif;
		font-size: 12px;
		color: #1a1c1e;
		cursor: pointer;
	}
	.fp-menu button:hover {
		background: #f2f6fe;
		color: #0b57d0;
	}
	.fp-menu-empty {
		padding: 8px;
		font-family: system-ui, sans-serif;
		font-size: 12px;
		color: #8a8f98;
	}
	.fp-refs {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.fp-ref-row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #4a4f58;
		background: #f7f8fa;
		border-radius: 5px;
		padding: 4px 6px;
	}
	.fp-ref-name {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-weight: 600;
		color: #0b57d0;
	}
	.fp-ref-arrow {
		color: #b0b4bb;
	}
	.fp-ref-src {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fp-ref-remove {
		border: none;
		background: none;
		color: #8a8f98;
		cursor: pointer;
		font-size: 13px;
		line-height: 1;
		padding: 0 2px;
	}
	.fp-ref-remove:hover {
		color: #b3261e;
	}
	.fp-preview {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		color: #1a7d3d;
		background: #f2f9f4;
		border-radius: 6px;
		padding: 7px 9px;
		word-break: break-word;
	}
	.fp-preview.fp-preview-error {
		color: #b3261e;
		background: #fdf1ef;
	}
	.fp-error {
		margin: 0;
		font-size: 11px;
		color: #b3261e;
	}
	.fp-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding: 14px 20px;
		border-top: 1px solid #e2e4e8;
		background: #fafafb;
		border-radius: 0 0 12px 12px;
	}
	.fp-btn {
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 8px 18px;
		border-radius: 6px;
		cursor: pointer;
	}
	.fp-btn-cancel {
		background: #fff;
		color: #1a1c1e;
		border: 1px solid #c9cdd4;
	}
	.fp-btn-cancel:hover {
		background: #f5f5f6;
	}
	.fp-btn-save {
		background: #0b57d0;
		color: #fff;
		border: none;
	}
	.fp-btn-save:hover {
		background: #0a4bb8;
	}
</style>
