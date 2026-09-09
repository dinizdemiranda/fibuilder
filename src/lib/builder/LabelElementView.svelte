<script>
	import JsBarcode from 'jsbarcode';
	import { parseBorderSpec, parseMm, parsePt, ptToMm, resolveTemplate } from './labels.js';

	let { element: el, scale, bindings = {} } = $props();

	let text = $derived(resolveTemplate(el.value, bindings));
	let left = $derived(el.x * scale);
	let top = $derived(el.y * scale);
	let width = $derived(el.width * scale);
	let height = $derived(el.height * scale);

	function borderWidthPx(spec) {
		const b = parseBorderSpec(spec);
		return b ? Math.max(0.5, b.widthMm * scale) : 0;
	}

	function borderCss(spec) {
		const b = parseBorderSpec(spec);
		if (!b) return 'none';
		return `${borderWidthPx(spec)}px ${b.style} ${b.color}`;
	}

	// Lines are authored with height:0 (their thickness comes entirely from the
	// border) — but a literal 0px wrapper with overflow:hidden clips that
	// border away. Give it just enough height to actually show.
	let displayHeight = $derived(el.type === 'line' ? Math.max(height, borderWidthPx(el.style?.borderTop)) : height);

	// jsbarcode only does 1D symbologies — QR/DataMatrix fall back to a
	// placeholder pattern until a 2D-capable replacement is chosen.
	function isLinearSymbology(symbology) {
		return symbology !== 'QR Code' && symbology !== 'QRCode' && symbology !== 'DataMatrix' && symbology !== 'Data Matrix';
	}

	// "Code128" -> "CODE128", matching jsbarcode's format names.
	function barcodeFormat(symbology) {
		return (symbology ?? 'CODE128').toUpperCase().replace(/[^A-Z0-9]/g, '');
	}

	let barcodeSvg = $state();

	$effect(() => {
		if (!barcodeSvg || el.type !== 'barcode' || !isLinearSymbology(el.symbology) || !text) return;
		try {
			JsBarcode(barcodeSvg, text, {
				format: barcodeFormat(el.symbology),
				displayValue: false,
				margin: 0,
				lineColor: el.style?.foreground ?? '#000000',
				background: 'transparent'
			});
			const w = parseFloat(barcodeSvg.getAttribute('width'));
			const h = parseFloat(barcodeSvg.getAttribute('height'));
			if (w > 0 && h > 0) barcodeSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
			barcodeSvg.removeAttribute('width');
			barcodeSvg.removeAttribute('height');
		} catch {
			// Sample data mid-edit in label_options.json can be invalid for the
			// symbology — leave whatever was last rendered rather than crash.
		}
	});
</script>

<div class="label-el" style="left:{left}px; top:{top}px; width:{width}px; height:{displayHeight}px;">
	{#if el.type === 'rectangle'}
		<div
			class="label-el-fill"
			style="background:{el.style?.fill ?? 'transparent'}; border:{borderCss(
				el.style?.border
			)}; border-radius:{parseMm(el.style?.borderRadius) * scale}px;"
		></div>
	{:else if el.type === 'line'}
		<div class="label-el-line" style="border-top:{borderCss(el.style?.borderTop)};"></div>
	{:else if el.type === 'text'}
		<div
			class="label-el-text"
			style="font-family:{el.style?.fontFamily ?? 'inherit'}; font-size:{ptToMm(parsePt(el.style?.fontSize)) *
				scale}px; font-weight:{el.style?.fontWeight ?? '400'}; font-style:{el.style?.fontStyle ??
				'normal'}; text-align:{el.style?.textAlign ?? 'left'}; color:{el.style?.color ??
				'#000'}; white-space:{el.style?.whiteSpace ?? 'nowrap'}; line-height:{el.style?.lineHeight ?? '1.2'};"
		>
			{text}
		</div>
	{:else if el.type === 'image'}
		<div class="label-el-image">
			<svg width="40%" height="40%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 12h14l-4.5-6-3 4-2-2.5L5 17Zm2.5-8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
				/>
			</svg>
		</div>
	{:else if el.type === 'barcode'}
		<div class="label-el-barcode">
			{#if isLinearSymbology(el.symbology)}
				<svg class="bars-svg" bind:this={barcodeSvg}></svg>
			{:else}
				<div class="qr-pattern"></div>
			{/if}
			{#if el.human_readable}
				<div class="barcode-caption">{text}</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.label-el {
		position: absolute;
		box-sizing: border-box;
		overflow: hidden;
	}
	.label-el-fill {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
	}
	.label-el-line {
		width: 100%;
		height: 100%;
	}
	.label-el-text {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.label-el-image {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		background: #eceef1;
		border: 1px solid #d3d6db;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #b0b4bb;
	}
	.label-el-barcode {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	.bars-svg {
		flex: 1;
		width: 100%;
		min-height: 0;
		display: block;
	}
	.barcode-caption {
		flex-shrink: 0;
		font-size: 7px;
		font-family: Arial, sans-serif;
		text-align: center;
		color: #000;
		overflow: hidden;
		white-space: nowrap;
	}
	.qr-pattern {
		width: 100%;
		height: 100%;
		background-color: #fff;
		background-image: repeating-conic-gradient(#000 0% 25%, #fff 0% 50%);
		background-size: 20% 20%;
	}
</style>
