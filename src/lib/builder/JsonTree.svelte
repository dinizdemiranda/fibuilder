<script>
	import Icon from './Icon.svelte';

	let { value, keyName = undefined, depth = 0, isLast = true } = $props();

	function isPlainObject(v) {
		return v !== null && typeof v === 'object' && !Array.isArray(v);
	}

	let isArr = $derived(Array.isArray(value));
	let isObj = $derived(isPlainObject(value));
	let expandable = $derived(isArr || isObj);
	let entries = $derived(isArr ? value.map((v, i) => [i, v]) : isObj ? Object.entries(value) : []);

	// Arrays longer than 5 start collapsed — a page can easily have a dozen+
	// elements/connections, and that's the case collapsing actually helps
	// with. Objects and short arrays start open since there's little to gain
	// from folding them by default.
	let collapsed = $state(isArr && value.length > 5);
	let itemWord = $derived(
		isArr ? (entries.length === 1 ? 'item' : 'items') : entries.length === 1 ? 'key' : 'keys'
	);

	function toggle() {
		collapsed = !collapsed;
	}

	function formatPrimitive(v) {
		if (typeof v === 'string') return JSON.stringify(v);
		return String(v);
	}
	function primitiveClass(v) {
		if (typeof v === 'string') return 'jt-string';
		if (typeof v === 'number') return 'jt-number';
		if (typeof v === 'boolean') return 'jt-boolean';
		if (v === null) return 'jt-null';
		return '';
	}
</script>

<div class="jt-row" style="padding-left:{depth * 16}px">
	{#if expandable}
		<button type="button" class="jt-toggle" class:open={!collapsed} onclick={toggle}>
			<Icon name="chevron" size={10} />
		</button>
	{:else}
		<span class="jt-toggle-spacer"></span>
	{/if}
	{#if keyName !== undefined}<span class="jt-key">"{keyName}"</span><span class="jt-punct">:</span>{' '}{/if}
	{#if expandable}
		<span class="jt-punct">{isArr ? '[' : '{'}</span>
		{#if collapsed}
			<button type="button" class="jt-preview" onclick={toggle}>{entries.length} {itemWord}</button>
			<span class="jt-punct">{isArr ? ']' : '}'}</span>{#if !isLast}<span class="jt-punct">,</span>{/if}
		{/if}
	{:else}
		<span class="jt-value {primitiveClass(value)}">{formatPrimitive(value)}</span>{#if !isLast}<span
				class="jt-punct">,</span
			>{/if}
	{/if}
</div>
{#if expandable && !collapsed}
	{#each entries as [k, v], i (isArr ? i : k)}
		<svelte:self value={v} keyName={isArr ? undefined : k} depth={depth + 1} isLast={i === entries.length - 1} />
	{/each}
	<div class="jt-row" style="padding-left:{depth * 16}px">
		<span class="jt-toggle-spacer"></span>
		<span class="jt-punct">{isArr ? ']' : '}'}</span>{#if !isLast}<span class="jt-punct">,</span>{/if}
	</div>
{/if}

<style>
	.jt-row {
		display: flex;
		align-items: flex-start;
		gap: 2px;
		white-space: pre-wrap;
	}
	.jt-toggle,
	.jt-toggle-spacer {
		flex-shrink: 0;
		width: 14px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.jt-toggle {
		border: none;
		background: none;
		padding: 0;
		color: #7f848e;
		cursor: pointer;
		transition: transform 0.1s ease;
	}
	.jt-toggle.open {
		transform: rotate(90deg);
	}
	.jt-toggle:hover {
		color: #d3d6db;
	}
	.jt-key {
		color: #e5c07b;
	}
	.jt-punct {
		color: #abb2bf;
	}
	.jt-value {
		word-break: break-all;
	}
	.jt-string {
		color: #98c379;
	}
	.jt-number {
		color: #d19a66;
	}
	.jt-boolean {
		color: #56b6c2;
	}
	.jt-null {
		color: #7f848e;
		font-style: italic;
	}
	.jt-preview {
		border: none;
		background: none;
		padding: 0;
		font-family: inherit;
		font-size: inherit;
		color: #7f848e;
		font-style: italic;
		cursor: pointer;
	}
	.jt-preview:hover {
		color: #abb2bf;
		text-decoration: underline;
	}
</style>
