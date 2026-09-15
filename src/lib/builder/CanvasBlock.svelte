<script>
	import { uiState, selectElement, removeElement, beginDragMove, endDrag } from './state.svelte.js';
	import { resolveProp } from './bindings.js';
	import ElementRenderer from './ElementRenderer.svelte';
	import FlowZone from './FlowZone.svelte';
	import Icon from './Icon.svelte';

	let { element, selected, style = '' } = $props();

	let isHidden = $derived(resolveProp(element, 'hidden') === 'true');
	let isDisabled = $derived(resolveProp(element, 'disabled') === 'true');

	// Hover is tracked via a single shared "which block id" instead of CSS :hover:
	// entering a nested child also fires mouseenter/:hover on every ancestor it
	// sits inside, which lit up a section and all its children together. Using
	// mouseover with stopPropagation means only the innermost block under the
	// pointer ever claims uiState.hoveredId.
	let hovered = $derived(uiState.hoveredId === element.id);

	function onMouseOver(e) {
		e.stopPropagation();
		uiState.hoveredId = element.id;
	}

	function onMouseOut() {
		if (uiState.hoveredId === element.id) uiState.hoveredId = null;
	}

	function onFocus(e) {
		e.stopPropagation();
		uiState.hoveredId = element.id;
	}

	function onBlur() {
		if (uiState.hoveredId === element.id) uiState.hoveredId = null;
	}

	function onDragStart(e) {
		e.stopPropagation();
		beginDragMove(element);
		e.dataTransfer.setData('text/plain', element.id);
		e.dataTransfer.effectAllowed = 'move';
	}

	function onDragEnd(e) {
		e.stopPropagation();
		endDrag();
	}

	function onClick(e) {
		e.stopPropagation();
		selectElement(element.id);
	}

	function onDelete(e) {
		e.stopPropagation();
		removeElement(element.id);
	}
</script>

<div
	class="fi-block"
	class:selected
	class:hovered
	data-element-id={element.id}
	{style}
	draggable="true"
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	onclick={onClick}
	onmouseover={onMouseOver}
	onmouseout={onMouseOut}
	onfocus={onFocus}
	onblur={onBlur}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && selectElement(element.id)}
>
	<div class="fi-block-toolbar">
		<span class="fi-block-name">
			<span class="fi-grip" data-tooltip="Drag to reorder"><Icon name="grip" size={13} /></span>
			<span class="fi-block-tag" data-tooltip={element.name}>{element.name}</span>
		</span>
		{#if isHidden}
			<span class="fi-state-badge" data-tooltip="Hidden — won't render in Preview">Hidden</span>
		{/if}
		{#if isDisabled}
			<span class="fi-state-badge" data-tooltip="Disabled">Disabled</span>
		{/if}
		<!-- {#if selected}
			<button type="button" class="fi-delete" data-tooltip="Delete" onclick={onDelete}>
				<Icon name="trash" size={13} />
			</button>
		{/if} -->
	</div>
	<div class="fi-block-content" class:is-hidden={isHidden} class:is-disabled={isDisabled}>
		{#if element.type === 'section'}
			<div class="fi-section-box" class:has-content={element.children.length > 0}>
				<FlowZone
					list={element.children}
					containerId={element.id}
					direction={element.direction}
					allowSections={false}
					emptyLabel="Drop components into this section"
					sizing={element.itemSizing}
					gap={element.gap}
					justify={element.justify}
					align={element.align ?? 'end'}
				/>
			</div>
		{:else if element.type === 'grid'}
			<FlowZone
				list={element.children}
				containerId={element.id}
				direction="vertical"
				allowSections={true}
				emptyLabel="Drop components into this grid"
				gridConfig={element}
			/>
		{:else}
			<ElementRenderer {element} />
		{/if}
	</div>
</div>

<style>
	.fi-block {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 0;
		border-radius: 2px;
		border: 1px solid transparent;
		cursor: default;
		box-sizing: border-box;
		/* Only matters for a fillHeight element (flex:1 1 auto) squeezed into
		   less space than its unpaginated/uncapped natural content wants —
		   without this, the browser's automatic min-height:auto refuses to
		   shrink it below that content, overflowing straight past a properly
		   bounded ancestor (e.g. .fi-column) instead of actually fitting it. */
		min-height: 0;
	}
	.fi-block.hovered {
		border-color: #67e8f9;
	}
	.fi-block.selected {
		border-color: #06b6d4;
		background: rgba(6, 182, 212, 0.06);
	}
	/* position: sticky (not absolute) so the tag clamps to stay inside the
	   visible scrolled viewport instead of rendering purely above the block —
	   an absolutely-positioned tag on a block scrolled to the very top of
	   .fi-page-scroll renders above row 0 of the visible area, which the
	   scroll container's own overflow clips away entirely. height: 0 keeps
	   it from adding to the block's box (it would otherwise nudge later
	   siblings down whenever shown), so the pill's own height is pulled back
	   up over the block's top edge with a fixed translateY instead of the
	   old calc(-100%) trick, which needed a non-zero box to measure against. */
	.fi-block-toolbar {
		position: sticky;
		/* sticky clamps its *own* (untransformed) box to this distance from
		   the scroll container's top — the transform below is applied on top
		   of that already-clamped position, so top must exceed the
		   transform's magnitude, or the transform just pushes it straight
		   back out past the container edge into the same clipping this was
		   meant to fix. */
		top: -24px;
		
		height: 0;
		left: 0;
		max-width: calc(100% + 160px);
		display: none;
		align-items: center;
		gap: 6px;
		pointer-events: none;
		z-index: 2;
	}
	.fi-block.hovered > .fi-block-toolbar,
	.fi-block.selected > .fi-block-toolbar {
		display: flex;
	}
	.fi-block-name {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 5px;
		max-width: 220px;
		background: #06b6d4;
		color: #fff;
		padding: 3px 7px 3px 5px;
		border-radius: 2px;
		flex-shrink: 0;
		transform: translate(-1px, calc(50% - 1px));
	}
	.fi-grip {
		display: flex;
		align-items: center;
		cursor: grab;
		color: rgba(255, 255, 255, 0.85);
	}
	.fi-block-tag {
		min-width: 0;
		font-family: system-ui, sans-serif;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.02em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fi-delete {
		pointer-events: auto;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		padding: 4px;
		color: #5a5f68;
		background: #fff;
		border: 1px solid #d3d6db;
		border-radius: 4px;
		cursor: pointer;
	}
	.fi-delete:hover {
		background: #fef2f2;
		border-color: #b3261e;
		color: #b3261e;
	}
	.fi-state-badge {
		pointer-events: auto;
		flex-shrink: 0;
		background: #78716c;
		color: #fff;
		font-family: system-ui, sans-serif;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 3px 6px;
		border-radius: 4px;
	}
	.fi-section-box {
		padding: 8px 0;
		box-sizing: border-box;
	}
	/* Empty sections already get their own dashed drop-target box from
	   .fi-flow-empty — only add this outline once there's real content to
	   otherwise have no boundary at all. */
	.fi-section-box.has-content {
		border: 1px dashed #d3d6db;
		border-radius: 8px;
	}
	.fi-block-content {
		flex: 1;
		min-height: 0;
	}
	/* Components render their real inputs in the canvas so they look right,
	   but they aren't live here — only in Preview. Typing/focusing into them
	   would be misleading, so block it; dropdowns are exempted since picking
	   an option doesn't invite the same "am I editing the real page?" confusion. */
	.fi-block-content :global(input),
	.fi-block-content :global(textarea) {
		pointer-events: none;
	}
	.fi-block-content.is-hidden {
		opacity: 0.6;
	}
	.fi-block-content.is-disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
