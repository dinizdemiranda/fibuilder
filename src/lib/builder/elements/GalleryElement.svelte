<script>
	import { getDataSourceById } from '../dataSources.js';
	import { filterRows, resetFilterSources } from '../dataLookup.js';
	import { previewCommands } from '../state.svelte.js';
	import { runRowSelectEvents } from '../events.js';
	import { resolveGalleryField, buildCardRows, GALLERY_SAMPLE_VALUES } from '../galleryFields.js';
	import Icon from '../Icon.svelte';

	let { element, preview = false } = $props();

	// Card sizing is fixed, not user-configurable — cards always grow to
	// fill each row (up to this max), leaving no leftover gap at the end of
	// a row the way a hard-capped auto-fill would.
	const CARD_MIN = 160;
	const CARD_MAX = 320;
	// 'auto' rows' fallback before a real tile has rendered to measure, and
	// whenever there's no bounded fill space to fit rows into at all.
	const FALLBACK_ROWS = 2;

	let source = $derived(getDataSourceById(element.props.dataSourceId));

	let displayedRows = $state([]);
	let selectedIndex = $state(null);

	$effect(() => {
		displayedRows = source?.rows ?? [];
		selectedIndex = null;
	});

	function onRefresh() {
		displayedRows = filterRows(source, element.props.filters, element.props.combinator);
		selectedIndex = null;
		page = 0;
	}
	function onResetFilters() {
		resetFilterSources(element.props.filters);
		displayedRows = source?.rows ?? [];
		selectedIndex = null;
		page = 0;
	}
	$effect(() => {
		if (previewCommands[element.id]?.refresh !== undefined) onRefresh();
	});
	$effect(() => {
		if (previewCommands[element.id]?.resetFilters !== undefined) onResetFilters();
	});

	let enabledFields = $derived(element.props.fields.filter((f) => f.enabled));
	let thumbnailField = $derived(enabledFields.find((f) => f.key === 'thumbnail'));
	let textRows = $derived(buildCardRows(enabledFields.filter((f) => f.key !== 'thumbnail')));

	// Canvas shows a sample value whenever a field's template resolves
	// empty, purely so the layout previews sensibly — Preview shows only
	// real data, hiding a field's row entirely when it has nothing to show.
	function rawValue(row, key) {
		return resolveGalleryField(element.props.fields.find((f) => f.key === key)?.parts, row);
	}
	function displayValue(row, key) {
		const real = rawValue(row, key);
		if (real) return real;
		return preview ? '' : (GALLERY_SAMPLE_VALUES[key] ?? '');
	}
	function fieldHasValue(row, key) {
		return preview ? !!rawValue(row, key) : true;
	}
	function pairHasValue(row, fields) {
		return fields.some((f) => fieldHasValue(row, f.key));
	}

	function selectItem(i) {
		const was = selectedIndex === i;
		selectedIndex = was ? null : i;
		if (preview && !was) runRowSelectEvents(element, pagedRows[i]);
	}

	// Preview defaults to the first row selected — same as if the user had
	// clicked it — so anything wired to "On Select" (a paired Data Lookup,
	// Image, or variable) has something to show immediately instead of
	// sitting empty until a real click happens. Re-fires whenever there's no
	// current selection and rows are available, which covers first mount as
	// well as after a refresh/reset-filters (both already clear
	// selectedIndex back to null above).
	$effect(() => {
		if (preview && selectedIndex === null && pagedRows.length > 0) selectItem(0);
	});

	// --- Pagination: the gallery never scrolls, so `rows` is exactly how
	// many rows show per page; the rest are reached via Back/Next. Column
	// count is fully computable from the known min/max card width.
	//
	// `rows` is either a manual number (pageSize computable with zero
	// measurement) or 'auto': as many *naturally sized* rows as fit the
	// available fill space, then — if there's a bit of room left over
	// that's not enough for another whole row — stretching those rows
	// (via the thumbnail, same as manual mode — see rowHeight/.fill-sized
	// below) just enough to use it up too, rather than leaving it blank.
	//
	// That "naturally sized" figure has to come from measuring an actual
	// rendered tile — but not one of the *displayed* ones, since those get
	// row-height-forced in fill mode, which would make firstTileH measure
	// its own stretched result instead of the true natural size, corrupting
	// the very row count that stretch amount depends on. A dedicated
	// hidden probe tile (below, in the template — same content, positioned
	// out of the grid's own row-track sizing) breaks that cycle: nothing
	// ever stretches it, so it always reports the genuine natural height.
	// bind:clientHeight is a live ResizeObserver, not a one-shot measure —
	// it (and everything derived from it) stays correct for any reason the
	// natural size could change: font metrics, card width, which fields
	// are on.
	let containerH = $state(0);
	let containerW = $state(0);
	let page = $state(0);
	let naturalTileH = $state(0);

	let colsPerRow = $derived.by(() => {
		if (containerW <= 0) return 1;
		let cols = Math.max(1, Math.ceil((containerW + element.props.gap) / (CARD_MAX + element.props.gap)));
		let colWidth = (containerW - element.props.gap * (cols - 1)) / cols;
		while (colWidth < CARD_MIN && cols > 1) {
			cols -= 1;
			colWidth = (containerW - element.props.gap * (cols - 1)) / cols;
		}
		return cols;
	});
	let cardWidth = $derived(colsPerRow > 0 ? (containerW - element.props.gap * (colsPerRow - 1)) / colsPerRow : 0);

	// A fill-stretched row (rowHeight below) can otherwise be squeezed
	// arbitrarily short by simply requesting more rows than the available
	// space comfortably holds — MIN_CARD_HEIGHT floors that, capping how
	// many rows (auto or manual) can ever be in play at once. Meaningless
	// for the horizontal layout, which never stretches rows in the first
	// place (rowHeight is always null there — see below), so it doesn't
	// need or get this cap; its own natural card height is already well
	// under MIN_CARD_HEIGHT.
	const MIN_CARD_HEIGHT = 120;
	let maxRowsForMinHeight = $derived.by(() => {
		if (element.props.cardLayout === 'horizontal' || !element.props.fillHeight || containerH <= 0) return Infinity;
		return Math.max(1, Math.floor((containerH + element.props.gap) / (MIN_CARD_HEIGHT + element.props.gap)));
	});

	let rowsIsAuto = $derived(element.props.rows === 'auto');
	let manualRows = $derived(
		Math.min(maxRowsForMinHeight, Math.max(1, typeof element.props.rows === 'number' ? element.props.rows : FALLBACK_ROWS))
	);
	let autoRowCount = $derived.by(() => {
		if (!element.props.fillHeight || containerH <= 0 || naturalTileH <= 0) return Math.min(maxRowsForMinHeight, FALLBACK_ROWS);
		return Math.max(
			1,
			Math.min(maxRowsForMinHeight, Math.floor((containerH + element.props.gap) / (naturalTileH + element.props.gap)))
		);
	});
	let rows = $derived(rowsIsAuto ? autoRowCount : manualRows);

	let pageSize = $derived(Math.max(1, colsPerRow * rows));
	let totalPages = $derived(Math.max(1, Math.ceil(displayedRows.length / pageSize)));
	let pagedRows = $derived(displayedRows.slice(page * pageSize, page * pageSize + pageSize));

	$effect(() => {
		if (page >= totalPages) page = Math.max(0, totalPages - 1);
	});

	// Fill mode's row height: with the row count known up front (manual, or
	// auto's own floor-based count above), the height each row needs to be
	// so that exactly that many of them (plus the gaps between) fill the
	// measured container exactly is simple division — this is what turns
	// auto's "leftover space smaller than one more row" into a small
	// per-row stretch instead of a gap, the same mechanism manual mode
	// already used, just with a computed row count instead of a typed-in
	// one. Applied as each row's actual track size (grid-auto-rows below),
	// with the tile stretching to match it (CSS Grid's own
	// align-items:stretch default) and the thumbnail (vertical/auto layout)
	// absorbing whatever's left after the text rows via flex — see
	// .fill-sized below — instead of insisting on its usual 4:3 aspect
	// ratio, which wouldn't necessarily add up to the exact height this
	// needs.
	//
	// Never applies to the horizontal layout specifically — its thumbnail
	// is a small, fixed 56x56 square next to the text, not the card's
	// dominant visual element, so stretching the row taller wouldn't grow
	// the thumbnail at all (nothing to absorb the extra height into) — just
	// pad empty space around it. Staying natural height and leaving a gap
	// looks better there than a taller row with a small fixed square
	// floating in the middle of it.
	let rowHeight = $derived.by(() => {
		if (element.props.cardLayout === 'horizontal') return null;
		if (!element.props.fillHeight || containerH <= 0) return null;
		return Math.max(0, (containerH - element.props.gap * (rows - 1)) / rows);
	});

	// max-content (not the implicit default `auto`) for the non-fill case:
	// under a height-constrained grid container, plain `auto` rows don't
	// size to their content's natural height the way flex items do — CSS
	// Grid's track-sizing algorithm instead shrinks every `auto` row
	// proportionally so the full set fits the container, however little
	// space that leaves. That doesn't apply here (nothing constrains the
	// grid's own height when fillHeight is off — see outerStyle), but
	// max-content is the same "always size to real content" guarantee for
	// zero added risk.
	let gridStyle = $derived(
		`display:grid; grid-template-columns: repeat(${colsPerRow}, 1fr); grid-auto-rows: ${rowHeight !== null ? `${rowHeight}px` : 'max-content'}; gap:${element.props.gap}px;`
	);
	// .fi-gallery's own parent (CanvasBlock's .fi-block-content) is a plain
	// block box, not a flex container — flex:1 there would be a no-op.
	// height:100% is what actually resolves against its (already
	// flex-stretched) ancestor when Fill is on. Off, no height at all —
	// the gallery just sizes to `rows` rows of natural content, like any
	// other block.
	let outerStyle = $derived(element.props.fillHeight ? 'height: 100%; overflow: hidden;' : 'overflow: hidden;');
</script>

<div class="fi-gallery" style={outerStyle}>
	{#if !source}
		<div class="fi-gallery-empty-msg">Select a data source in the properties panel.</div>
	{:else}
		<div class="fi-gallery-grid" bind:clientWidth={containerW} bind:clientHeight={containerH} style={gridStyle}>
			{#snippet tileContent(row)}
				{#if thumbnailField && (!preview || rawValue(row, 'thumbnail'))}
					<div class="fi-gallery-thumb">
						{#if rawValue(row, 'thumbnail')}
							<img src={rawValue(row, 'thumbnail')} alt="" />
						{:else}
							<Icon name="image" size={22} />
						{/if}
					</div>
				{/if}
				<div class="fi-gallery-text-rows">
					{#each textRows as tr (tr.fields.map((f) => f.key).join('+'))}
						{#if tr.type === 'pair'}
							{#if pairHasValue(row, tr.fields)}
								<div class="fi-gallery-row">
									{#each tr.fields as f (f.key)}
										{#if fieldHasValue(row, f.key)}
											<span class="fi-gallery-{f.key === 'tag' ? 'tag' : 'featured'}">{displayValue(row, f.key)}</span>
										{/if}
									{/each}
								</div>
							{/if}
						{:else if fieldHasValue(row, tr.fields[0].key)}
							{#if tr.fields[0].key === 'title'}
								<div class="fi-gallery-title">{displayValue(row, 'title')}</div>
							{:else if tr.fields[0].key === 'subtitle'}
								<div class="fi-gallery-subtitle">{displayValue(row, 'subtitle')}</div>
							{:else if tr.fields[0].key === 'tag'}
								<span class="fi-gallery-tag">{displayValue(row, 'tag')}</span>
							{:else}
								<span class="fi-gallery-featured">{displayValue(row, 'featuredText')}</span>
							{/if}
						{/if}
					{/each}
				</div>
			{/snippet}
			{#if rowsIsAuto && element.props.fillHeight && displayedRows.length > 0}
				<!-- Hidden probe, out of the grid's own row-track sizing —
				     see the comment on naturalTileH above for why this can't
				     just be one of the displayed tiles. -->
				<div
					class="fi-gallery-tile fi-gallery-tile--{element.props.cardLayout} fi-gallery-probe"
					style="width: {cardWidth}px;"
					bind:clientHeight={naturalTileH}
					aria-hidden="true"
				>
					{@render tileContent(displayedRows[0])}
				</div>
			{/if}
			{#if displayedRows.length === 0}
				{#each { length: pageSize } as _, i (i)}
					<div class="fi-gallery-tile fi-gallery-placeholder"></div>
				{/each}
			{:else}
				{#each pagedRows as row, i (page * pageSize + i)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="fi-gallery-tile fi-gallery-tile--{element.props.cardLayout}"
						class:selected={selectedIndex === i}
						class:fill-sized={rowHeight !== null}
						onclick={() => selectItem(i)}
						role="button"
						tabindex="0"
					>
						{@render tileContent(row)}
					</div>
				{/each}
			{/if}
		</div>
		<div class="fi-gallery-footer">
			{#if element.props.showControls}
				<div class="fi-gallery-footer-controls">
					<button type="button" class="fi-gallery-reset" onclick={onResetFilters}>Reset filters</button>
					<button type="button" class="fi-gallery-refresh" onclick={onRefresh}>Refresh</button>
				</div>
			{/if}
			{#if totalPages > 1}
				<div class="fi-gallery-pager">
					<button type="button" class="fi-gallery-page-btn" disabled={page === 0} onclick={() => (page -= 1)}>
						<Icon name="chevron" size={20} />
					</button>
					<span class="fi-gallery-page-label">Page {page + 1} of {totalPages}</span>
					<button
						type="button"
						class="fi-gallery-page-btn fi-gallery-page-btn-next"
						disabled={page >= totalPages - 1}
						onclick={() => (page += 1)}
					>
						<Icon name="chevron" size={20} />
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.fi-gallery {
		width: 100%;
		font-family: var(--fi-font);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.fi-gallery-empty-msg {
		padding: 16px;
		text-align: center;
		font-size: 13px;
		color: var(--fi-on-surface-variant);
		background: var(--fi-surface);
		border: 1px dashed var(--fi-outline);
		border-radius: var(--fi-radius);
	}
	.fi-gallery-grid {
		width: 100%;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		align-content: start;
		position: relative;
	}
	/* Renders off in the grid's own corner but never paints or takes part
	   in layout for anyone else — see naturalTileH's comment above for why
	   this exists instead of just measuring a displayed tile. */
	.fi-gallery-probe {
		position: absolute;
		top: 0;
		left: 0;
		visibility: hidden;
		pointer-events: none;
	}
	.fi-gallery-tile {
		box-sizing: border-box;
		background: var(--fi-surface);
		border: 1px solid var(--fi-outline);
		border-radius: var(--fi-radius);
		padding: 10px;
		cursor: pointer;
		overflow: hidden;
		display: flex;
		gap: 8px;
	}
	.fi-gallery-tile:hover {
		border-color: var(--fi-primary);
	}
	.fi-gallery-tile.selected {
		border-color: var(--fi-primary);
		box-shadow: 0 0 0 1px var(--fi-primary);
	}
	.fi-gallery-placeholder {
		border-style: dashed;
		background: color-mix(in srgb, var(--fi-outline) 20%, transparent);
		cursor: default;
		min-height: 140px;
	}
	.fi-gallery-placeholder:hover {
		border-color: var(--fi-outline);
	}

	.fi-gallery-tile--vertical {
		flex-direction: column;
	}
	.fi-gallery-tile--vertical .fi-gallery-thumb {
		width: 100%;
		aspect-ratio: 4 / 3;
	}
	/* Fill mode gives every tile an explicit, exact height (rowHeight, via
	   grid-auto-rows — CSS Grid's default align-items:stretch then makes
	   the tile itself match it) so that `rows` of them plus the gaps
	   between exactly fill the available space, with nothing left over and
	   nothing cut off. A fixed 4:3 thumbnail wouldn't necessarily add up to
	   that exact height, so it switches to flex:1 instead — absorbing
	   whatever's left after the text rows take their own natural size,
	   whatever that turns out to be. object-fit:cover on the <img> (below)
	   means an off-4:3 result still crops sensibly instead of distorting. */
	.fi-gallery-tile--vertical.fill-sized .fi-gallery-thumb {
		aspect-ratio: auto;
		flex: 1;
		min-height: 0;
	}
	/* .fi-gallery-text-rows' own flex:1 (below) exists for the horizontal
	   layout, where it needs to fill the remaining *width* next to a fixed
	   56x56 thumbnail. In vertical fill-sized mode that same flex:1 fights
	   the thumbnail for the row's leftover *height* — both being flex:1
	   split it 50/50 regardless of how little (or how much) text there
	   actually is. Pinning it back to its natural content size here is
	   what makes the thumbnail the only part that actually varies. */
	.fi-gallery-tile--vertical.fill-sized .fi-gallery-text-rows {
		flex: none;
	}
	.fi-gallery-tile--horizontal {
		flex-direction: row;
		align-items: flex-start;
	}
	.fi-gallery-tile--horizontal .fi-gallery-thumb {
		width: 56px;
		height: 56px;
		flex-shrink: 0;
	}
	/* Auto: same markup either way, but a container query on the tile picks
	   whichever layout actually fits — once a tile is squeezed narrower than
	   fits two comfortably side by side, it reads better as a thumbnail-left
	   row than a cramped top-heavy stack. */
	.fi-gallery-tile--auto {
		container-type: inline-size;
		flex-direction: column;
	}
	.fi-gallery-tile--auto .fi-gallery-thumb {
		width: 100%;
		aspect-ratio: 4 / 3;
	}
	.fi-gallery-tile--auto.fill-sized .fi-gallery-thumb {
		aspect-ratio: auto;
		flex: 1;
		min-height: 0;
	}
	.fi-gallery-tile--auto.fill-sized .fi-gallery-text-rows {
		flex: none;
	}
	@container (max-width: 200px) {
		.fi-gallery-tile--auto {
			flex-direction: row;
			align-items: flex-start;
		}
		.fi-gallery-tile--auto.fill-sized {
			align-items: center;
		}
		/* Re-asserted for the fill-sized variant too (not just the plain
		   selector above) — a fill-sized thumbnail rule needs to win back
		   over here despite having higher specificity than the plain one,
		   since it's the one actually in effect once fill-sized is on. */
		.fi-gallery-tile--auto .fi-gallery-thumb,
		.fi-gallery-tile--auto.fill-sized .fi-gallery-thumb {
			width: 56px;
			height: 56px;
			aspect-ratio: auto;
			flex: none;
		}
		/* Flipped to horizontal here — text-rows goes back to flex:1 to
		   fill the remaining *width* next to the now-fixed-size thumbnail,
		   same as the always-horizontal layout. */
		.fi-gallery-tile--auto.fill-sized .fi-gallery-text-rows {
			flex: 1;
		}
	}

	.fi-gallery-thumb {
		border-radius: calc(var(--fi-radius) - 2px);
		background: #eceef1;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9aa0a8;
		flex-shrink: 0;
	}
	.fi-gallery-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.fi-gallery-text-rows {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		justify-content: center;
	}
	.fi-gallery-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--fi-on-surface);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fi-gallery-subtitle {
		font-size: 12px;
		color: var(--fi-on-surface-variant);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fi-gallery-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.fi-gallery-tag {
		font-size: 11px;
		font-weight: 600;
		color: var(--fi-on-surface-variant);
		background: color-mix(in srgb, var(--fi-outline) 30%, transparent);
		padding: 2px 8px;
		border-radius: 999px;
	}
	.fi-gallery-featured {
		font-size: 13px;
		font-weight: 700;
		color: var(--fi-primary);
		margin-left: auto;
	}
	.fi-gallery-footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.fi-gallery-footer-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.fi-gallery-reset {
		flex-shrink: 0;
		font-family: inherit;
		font-size: 12px;
		font-weight: 500;
		padding: 6px 14px;
		border-radius: var(--fi-radius);
		border: 1px solid var(--fi-outline);
		background: transparent;
		color: var(--fi-on-surface-variant);
		cursor: pointer;
	}
	.fi-gallery-refresh {
		flex-shrink: 0;
		font-family: inherit;
		font-size: 12px;
		font-weight: 500;
		padding: 6px 14px;
		border-radius: var(--fi-radius);
		border: none;
		background: var(--fi-primary);
		color: #fff;
		cursor: pointer;
	}
	.fi-gallery-pager {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.fi-gallery-page-label {
		font-size: 12px;
		color: var(--fi-on-surface-variant);
		white-space: nowrap;
	}
	.fi-gallery-page-btn {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: 1px solid var(--fi-outline);
		background: var(--fi-surface);
		color: var(--fi-on-surface);
		cursor: pointer;
		transform: rotate(180deg);
	}
	.fi-gallery-page-btn-next {
		transform: none;
	}
	.fi-gallery-page-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
