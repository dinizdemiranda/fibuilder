<script>
	import { sourceCandidates, anySourceCandidates } from '../bindings.js';
	import { blockDefs } from '../types.js';
	import { positionBelow } from '../floatingMenuPosition.js';
	import { textPixelWidth } from '../textMeasure.js';
	import Icon from '../Icon.svelte';
	import FormulaPopover from './FormulaPopover.svelte';

	let { element, fieldKey, fieldType, placeholder = '', multiline = false } = $props();

	let binding = $derived(element.bindings?.[fieldKey]);
	let hasExpression = $derived(binding?.kind === 'expression');
	let parts = $derived(hasExpression ? binding.parts : [{ type: 'literal', value: element.props?.[fieldKey] ?? '' }]);

	let pickerOpen = $state(false);
	let candidates = $derived(sourceCandidates(element.id, fieldType));
	let componentCandidates = $derived(candidates.filter((c) => c.type !== 'variable' && c.type !== 'method'));
	let variableCandidates = $derived(candidates.filter((c) => c.type === 'variable'));
	let methodCandidates = $derived(candidates.filter((c) => c.type === 'method'));
	let fieldEl = $state(null);

	// Which literal segment (and caret position within it) the picker/formula
	// popover should insert into — set on focus of any literal input (not
	// just the trailing one), so a chip can land between two existing chips,
	// not only at the end.
	let activeLiteralIndex = $state(null);
	let activeLiteralEl = $state(null);

	// Separate from the above (which persists after blur, for insertion
	// memory) — this is only "is this literal focused right now," purely to
	// decide whether it gets a little extra caret room in literalWidth.
	let focusedIndex = $state(null);

	function caretSplit() {
		const idx = activeLiteralIndex ?? parts.length - 1;
		const value = parts[idx]?.value ?? '';
		const pos = activeLiteralEl && activeLiteralEl.selectionStart != null ? activeLiteralEl.selectionStart : value.length;
		return { idx, before: value.slice(0, pos), after: value.slice(pos) };
	}

	// A formula's own reference picker is deliberately not limited to
	// fieldType-compatible sources the way the chip picker above is — the
	// formula's JS code can coerce/format across types itself (e.g. a
	// ternary in a number field reading a text variable), so it can pull
	// from anything with a value.
	let formulaCandidates = $derived(anySourceCandidates(element.id));
	let formulaPopoverOpen = $state(false);
	let editingFormulaIndex = $state(null);
	let editingFormula = $derived(editingFormulaIndex !== null ? (parts[editingFormulaIndex]?.formula ?? null) : null);

	function truncateCode(s, n = 18) {
		return s.length > n ? `${s.slice(0, n - 1)}…` : s;
	}

	function openFormulaCreator() {
		pickerOpen = false;
		editingFormulaIndex = null;
		formulaPopoverOpen = true;
	}

	function openFormulaEditor(i) {
		editingFormulaIndex = i;
		formulaPopoverOpen = true;
	}

	function saveFormula(formula) {
		if (editingFormulaIndex !== null) {
			binding.parts[editingFormulaIndex].formula = formula;
		} else {
			const { idx, before, after } = caretSplit();
			const b = ensureExpression();
			b.parts[idx] = { type: 'literal', value: before };
			b.parts.splice(idx + 1, 0, { type: 'formula', formula }, { type: 'literal', value: after });
		}
		formulaPopoverOpen = false;
	}

	function ensureExpression() {
		if (!element.bindings) element.bindings = {};
		if (element.bindings[fieldKey]?.kind !== 'expression') {
			const current = element.props?.[fieldKey] ?? '';
			element.bindings[fieldKey] = { kind: 'expression', parts: current ? [{ type: 'literal', value: current }] : [] };
		}
		return element.bindings[fieldKey];
	}

	function insertChip(src) {
		const { idx, before, after } = caretSplit();
		const b = ensureExpression();
		b.parts[idx] = { type: 'literal', value: before };
		b.parts.splice(idx + 1, 0, { type: 'ref', sourceId: src.id }, { type: 'literal', value: after });
		pickerOpen = false;
	}

	function updateLiteral(i, value) {
		if (hasExpression) {
			binding.parts[i].value = value;
		} else {
			if (!element.props) element.props = {};
			element.props[fieldKey] = value;
		}
	}

	function removeChip(i) {
		const b = element.bindings[fieldKey];
		b.parts.splice(i, 1);
		if (!b.parts.some((p) => p.type === 'ref' || p.type === 'formula')) {
			const merged = b.parts.map((p) => p.value ?? '').join('');
			delete element.bindings[fieldKey];
			element.props[fieldKey] = merged;
		}
	}

	// Moves focus into the literal at parts index `idx` (skipping the chip
	// between it and the one arrow-keyed away from — parts always alternate
	// literal/chip/literal by construction, so that's always another
	// literal, never a chip itself) and lands the caret at its start or end.
	function focusLiteralAt(idx, where) {
		const target = fieldEl?.querySelector(`.ef-literal[data-index="${idx}"]`);
		if (!target) return;
		target.focus();
		const pos = where === 'start' ? 0 : target.value.length;
		target.setSelectionRange(pos, pos);
	}

	function onLiteralKeydown(e, i) {
		const el = e.currentTarget;
		if (e.key === 'Backspace' && el.value === '' && i > 0 && parts[i - 1].type !== 'literal') {
			e.preventDefault();
			removeChip(i - 1);
		}
		// Stop propagation only when this actually closed something local —
		// otherwise Escape should keep bubbling so an ancestor popover this
		// field might be sitting inside (a variable's value field, an
		// event's "set a field" value) still closes on Escape as normal.
		if (e.key === 'Escape' && pickerOpen) {
			e.stopPropagation();
			pickerOpen = false;
		}
		// Arrow keys default to stopping dead at this input's own boundary —
		// each literal is a separate <input>, so the browser has no idea
		// there's more field to the left/right of it. Continue the caret
		// straight through the adjacent chip into the next literal instead,
		// so the whole field reads as one continuous line you can navigate
		// with the keyboard, chips and all. Shift+arrow is left alone (an
		// in-input selection can't span into a chip anyway).
		if (e.key === 'ArrowRight' && !e.shiftKey && el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
			if (i < parts.length - 1) {
				e.preventDefault();
				focusLiteralAt(i + 2, 'start');
			}
		} else if (e.key === 'ArrowLeft' && !e.shiftKey && el.selectionStart === 0 && el.selectionEnd === 0) {
			if (i > 0) {
				e.preventDefault();
				focusLiteralAt(i - 2, 'end');
			}
		}
	}

	function onLiteralFocus(e, i) {
		activeLiteralIndex = i;
		activeLiteralEl = e.currentTarget;
		focusedIndex = i;
		pickerOpen = true;
	}

	function onLiteralBlur(i) {
		if (focusedIndex === i) focusedIndex = null;
	}

	// Typing "#" anywhere in the field opens the same picker the trailing
	// segment already opens on focus — a mention-style trigger so a chip
	// can be inserted mid-text without reaching for the mouse. The "#"
	// itself is consumed rather than left sitting in the literal.
	function onLiteralInput(e, i) {
		const el = e.currentTarget;
		const pos = el.selectionStart ?? el.value.length;
		if (pos > 0 && el.value[pos - 1] === '#') {
			const value = el.value.slice(0, pos - 1) + el.value.slice(pos);
			// The stripped value can equal what the reactive part.value
			// already was (e.g. typing "#" right after a fresh focus with no
			// other edit yet) — a no-op from Svelte's own diffing, which
			// would then skip writing the DOM back and leave the browser's
			// own "#" insertion sitting in the input. Write it imperatively
			// too so the field always reflects the stripped text.
			el.value = value;
			el.setSelectionRange(pos - 1, pos - 1);
			updateLiteral(i, value);
			activeLiteralIndex = i;
			activeLiteralEl = el;
			pickerOpen = true;
			return;
		}
		updateLiteral(i, el.value);
	}

	// Clicking blank space inside the field (not a chip or an existing input)
	// focuses the trailing segment, which opens the picker via its own focus.
	function onFieldClick(e) {
		if (e.target === fieldEl) {
			fieldEl.querySelector('.ef-literal:last-of-type')?.focus();
		}
	}

	// Closes the picker on a click outside the field — a plain containment
	// check rather than a full-viewport intercepting backdrop, which used
	// to sit on top of the field itself and swallow every click inside it,
	// including the click a user makes to move their cursor to a specific
	// spot before inserting a chip there. The menu (position: fixed, but
	// still a DOM child of the field — see floatingMenuPosition.js) is
	// covered by the same containment check, so picking an item from it
	// doesn't count as "outside" either.
	function onWindowMousedown(e) {
		if (pickerOpen && fieldEl && !fieldEl.contains(e.target)) pickerOpen = false;
	}

	// Sizing a literal input by character COUNT (`Nch`) rather than actual
	// pixel width was the source of a misleading gap: `ch` approximates a
	// monospace "0"-glyph width and the old formula also padded by a whole
	// extra character "for comfortable typing," so a 4-character word like
	// "Test" reserved a visibly wider box than the word itself renders at —
	// reading as if a space followed it even when the literal was exactly
	// "Test", zero trailing characters. Measuring the actual rendered pixel
	// width (same font as .ef-literal) and sizing to that exactly — plus a
	// few px of caret room, and only while the field is focused — means the
	// box always matches what's really there: no gap you can see that isn't
	// backed by a real character in the data.
	function literalWidth(value, placeholderText = '', isFocused = false) {
		const text = value || placeholderText;
		const caretRoom = isFocused ? 4 : 0;
		return `${Math.max(2, Math.ceil(textPixelWidth(text)) + caretRoom)}px`;
	}
</script>

<svelte:window onmousedown={onWindowMousedown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ef-field" class:multiline bind:this={fieldEl} onclick={onFieldClick}>
	{#each parts as part, i (i)}
		{#if part.type === 'ref'}
			{@const src = candidates.find((c) => c.id === part.sourceId) ?? null}
			<span class="ef-chip" class:ef-chip-variable={src?.type === 'variable'} class:ef-chip-method={src?.type === 'method'}>
				{#if src}<Icon
						name={src.type === 'variable' ? 'variable' : src.type === 'method' ? 'clock' : (blockDefs[src.type]?.icon ?? 'text')}
						size={11}
					/>{/if}
				{src?.name ?? 'Deleted field'}
				<button type="button" class="ef-chip-remove" data-tooltip="Remove" onclick={() => removeChip(i)}>×</button>
			</span>
		{:else if part.type === 'formula'}
			<span class="ef-chip ef-chip-formula">
				<button type="button" class="ef-chip-edit" onclick={() => openFormulaEditor(i)}>
					<Icon name="formula" size={11} />
					{part.formula?.code ? truncateCode(part.formula.code) : 'Formula'}
				</button>
				<button type="button" class="ef-chip-remove" data-tooltip="Remove" onclick={() => removeChip(i)}>×</button>
			</span>
		{:else}
			<input
				class="ef-literal"
				type="text"
				data-index={i}
				style="width: {literalWidth(part.value, parts.length === 1 ? placeholder : '', focusedIndex === i)}"
				placeholder={parts.length === 1 ? placeholder : ''}
				value={part.value}
				onfocus={(e) => onLiteralFocus(e, i)}
				onblur={() => onLiteralBlur(i)}
				oninput={(e) => onLiteralInput(e, i)}
				onkeydown={(e) => onLiteralKeydown(e, i)}
			/>
		{/if}
	{/each}

	{#if pickerOpen}
		<div class="ef-menu" style={positionBelow(fieldEl)}>
			{#if componentCandidates.length}
				<div class="ef-menu-heading">Components</div>
				{#each componentCandidates as src (src.id)}
					<button type="button" onclick={() => insertChip(src)}>
						<Icon name={blockDefs[src.type]?.icon ?? 'text'} size={13} />
						{src.name}
					</button>
				{/each}
			{/if}
			{#if variableCandidates.length}
				<div class="ef-menu-heading">Variables</div>
				{#each variableCandidates as src (src.id)}
					<button type="button" onclick={() => insertChip(src)}>
						<Icon name="variable" size={13} />
						{src.name}
					</button>
				{/each}
			{/if}
			{#if methodCandidates.length}
				<div class="ef-menu-heading">Methods</div>
				{#each methodCandidates as src (src.id)}
					<button type="button" onclick={() => insertChip(src)}>
						<Icon name="clock" size={13} />
						{src.name}
					</button>
				{/each}
			{/if}
			<div class="ef-menu-heading">Formula</div>
			<button type="button" onclick={openFormulaCreator}>
				<Icon name="formula" size={13} />
				Create formula…
			</button>
		</div>
	{/if}
</div>

{#if formulaPopoverOpen}
	<FormulaPopover
		candidates={formulaCandidates}
		initialFormula={editingFormula}
		onsave={saveFormula}
		oncancel={() => (formulaPopoverOpen = false)}
	/>
{/if}

<style>
	.ef-field {
		/* No flex `gap` here on purpose — it used to add a uniform 4px
		   between every chip/literal regardless of whether the literal
		   between them actually held a typed space, which (combined with
		   the literal's own min-width) rendered a visible gap even when the
		   underlying text had zero characters there — misleading, since it
		   looked exactly like a real space. Spacing now comes only from
		   .ef-chip's own margin plus whatever a literal's actual content
		   measures to, so the gap you see always matches the text you'd get
		   back out. */
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		width: 100%;
		min-height: 34px;
		padding: 5px 6px;
		border: 1px solid #d3d6db;
		border-radius: 6px;
		background: #fff;
		box-sizing: border-box;
		cursor: text;
	}
	.ef-field:focus-within {
		border-color: #0b57d0;
	}
	.ef-field.multiline {
		min-height: 72px;
		align-content: flex-start;
	}
	.ef-literal {
		flex-shrink: 0;
		max-width: 100%;
		min-width: 2px;
		border: none;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: 13px;
		color: #1a1c1e;
		padding: 2px 0;
	}
	.ef-chip {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		/* The only source of chip-adjacent spacing now that .ef-field has no
		   gap — see the comment there. */
		margin: 0 2px;
		background: #e6f4ea;
		color: #1a7d3d;
		border: 1px solid #b7e2c4;
		border-radius: 5px;
		padding: 2px 3px 2px 7px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	.ef-chip.ef-chip-variable {
		background: #f4edfc;
		color: #6b3fa0;
		border-color: #d9c7f5;
	}
	.ef-chip.ef-chip-variable .ef-chip-remove {
		color: #6b3fa0;
	}
	.ef-chip.ef-chip-method {
		background: #fef3e2;
		color: #9a5b00;
		border-color: #f5d9a8;
	}
	.ef-chip.ef-chip-method .ef-chip-remove {
		color: #9a5b00;
	}
	.ef-chip.ef-chip-formula {
		background: #e8f0fe;
		color: #0b57d0;
		border-color: #c6dafc;
	}
	.ef-chip.ef-chip-formula .ef-chip-remove {
		color: #0b57d0;
	}
	.ef-chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: none;
		background: none;
		color: #1a7d3d;
		cursor: pointer;
		border-radius: 3px;
		font-size: 13px;
		line-height: 1;
		padding: 0;
	}
	.ef-chip-remove:hover {
		background: rgba(0, 0, 0, 0.08);
	}
	.ef-chip-edit {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border: none;
		background: none;
		padding: 0;
		font: inherit;
		font-weight: 600;
		color: inherit;
		cursor: pointer;
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ef-menu {
		/* position/top/left/bottom come from the inline style (see
		   floatingMenuPosition.js) — position: fixed there, computed from
		   the field's real viewport rect, so no scrollable ancestor can
		   clip or misuse this menu's box. */
		min-width: 190px;
		max-height: 220px;
		overflow-y: auto;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
		z-index: 1200;
		padding: 4px;
	}
	.ef-menu-heading {
		padding: 6px 8px 2px;
		font-family: system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8a8f98;
	}
	.ef-menu button {
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
	.ef-menu button:hover {
		background: #f2f6fe;
		color: #0b57d0;
	}
</style>
