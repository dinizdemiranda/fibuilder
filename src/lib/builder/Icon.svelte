<script>
	let { name, size = 18 } = $props();

	const paths = {
		text: 'M4 4h16v2.5H4V4Zm4 4h8v11.5h-2.5V10.5h-3V19.5H8V8Z',
		textfield: 'M3 7h18v3H3V7Zm0 5h12v2H3v-2Z',
		button: 'M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Zm3-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H7Z',
		options: 'M4 6h2v2H4V6Zm4 0h12v2H8V6ZM4 11h2v2H4v-2Zm4 0h12v2H8v-2ZM4 16h2v2H4v-2Zm4 0h12v2H8v-2Z',
		image: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 12h14l-4.5-6-3 4-2-2.5L5 17Zm2.5-8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
		label: 'M3 11.5 11.5 3H19a2 2 0 0 1 2 2v7.5l-8.5 8.5a2 2 0 0 1-2.8 0L3 13.8a2 2 0 0 1 0-2.3Zm12.5-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
		preview: 'M12 5c5 0 9 4.5 9 7s-4 7-9 7-9-4.5-9-7 4-7 9-7Zm0 3.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm0 2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z',
		lookup: 'M11 4a7 7 0 1 1-4.95 11.95L2 20l-1.4-1.4 4.05-4.05A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
		grip: 'M8 5h2v2H8V5Zm6 0h2v2h-2V5ZM8 11h2v2H8v-2Zm6 0h2v2h-2v-2ZM8 17h2v2H8v-2Zm6 0h2v2h-2v-2Z',
		copy: 'M8 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1v-2h1V4H8v1H6V4a2 2 0 0 1 2-2Zm-2 5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v11h10V9H6Z',
		folder: 'M3 5a1 1 0 0 1 1-1h5.4l1.6 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5Z',
		gallery: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
		grid: 'M3 3h6v6H3V3Zm7.5 0H16v6h-5.5V3ZM17.5 3H21v6h-3.5V3ZM3 10.5h6V16H3v-5.5Zm7.5 0H16V16h-5.5v-5.5ZM17.5 10.5H21V16h-3.5v-5.5ZM3 17.5h6V21H3v-3.5Zm7.5 0H16V21h-5.5v-3.5ZM17.5 17.5H21V21h-3.5v-3.5Z',
		section: 'M4 4h16v16H4V4Zm2 2v12h6V6H6Zm8 0v5h4V6h-4Zm0 7v5h4v-5h-4Z',
		trash: 'M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9Z',
		chevron: 'M8 5l8 7-8 7V5Z',
		portrait: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v16h8V4H8Z',
		landscape: 'M2 8v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Zm2 0h16v8H4V8Z',
		check: 'M9.5 16.2 5.3 12l-1.4 1.4L9.5 19l11-11-1.4-1.4L9.5 16.2Z',
		plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z',
		minus: 'M4 11h16v2H4z',
		zoomFit:
			'M3 3h7v2H5v5H3V3Zm11 0h7v7h-2V5h-5V3ZM3 14h2v5h5v2H3v-7Zm16 0h2v7h-7v-2h5v-5Z',
		close: 'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6Z',
		calendar: 'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2Zm-2 7v10h14V9H5Zm2 3h4v4H7v-4Z',
		divider: 'M3 11h18v2H3z',
		number: 'M4 16h3v4H4v-4Zm6-6h3v10h-3V10Zm6-6h3v16h-3V4Z',
		database: 'M12 2C7.58 2 4 3.79 4 6s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4ZM4 8v4c0 2.21 3.58 4 8 4s8-1.79 8-4V8c0 2.21-3.58 4-8 4s-8-1.79-8-4Zm0 6v4c0 2.21 3.58 4 8 4s8-1.79 8-4v-4c0 2.21-3.58 4-8 4s-8-1.79-8-4Z',
		layers: 'M12 2 2 7l10 5 10-5-10-5Zm0 7.2L4.4 7 12 4.2 19.6 7 12 9.2ZM2 12l10 5 10-5-1.8-.9L12 15.1l-8.2-4-1.8.9Zm0 5 10 5 10-5-1.8-.9L12 20.1l-8.2-4-1.8.9Z',
		bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
		variable: 'M5 12a7 7 0 1 0 14 0 7 7 0 1 0 -14 0Z',
		heading1: 'M3 5h2.5v6h5V5H13v14h-2.5v-6h-5v6H3V5Zm14.8 0h1.7v14h-2.4V8.1L15 9.2V6.9L17.8 5Z',
		heading2: 'M3 5h2.5v6h5V5H13v14h-2.5v-6h-5v6H3V5Zm11.3 3.6a3.4 3.4 0 0 1 3.5-3.6c2 0 3.5 1.3 3.5 3.2 0 1.4-.7 2.4-2.3 3.9L16.8 13H21v2h-6.7v-1.7l3.4-3.3c1.1-1.1 1.5-1.7 1.5-2.4 0-.8-.6-1.3-1.4-1.3-.8 0-1.4.6-1.5 1.5Z',
		heading3: 'M3 5h2.5v6h5V5H13v14h-2.5v-6h-5v6H3V5Zm12 .2h4.8a2.6 2.6 0 0 1 1.9 4.4c1 .4 1.7 1.3 1.7 2.5 0 1.9-1.5 3.1-3.7 3.1-1.7 0-3-.7-3.7-1.9l1.7-1c.4.7 1.1 1.1 2 1.1 1 0 1.6-.5 1.6-1.3 0-.8-.6-1.2-1.7-1.2h-1v-1.8h.9c1 0 1.5-.4 1.5-1.1 0-.7-.5-1.1-1.4-1.1-.8 0-1.4.4-1.7 1l-1.7-.9c.5-1.1 1.7-1.8 3.1-1.8Z',
		bodyText: 'M4 5h16v2H4V5Zm0 4.5h16v2H4v-2ZM4 14h16v2H4v-2Zm0 4.5h10v2H4v-2Z',
		dropdown: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm1 2v8h14V8H5Zm10.3 2.3 1.4 1.4-3.7 3.7-3.7-3.7 1.4-1.4 2.3 2.3Z',
		radio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
		checkbox: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v14h14V5H5Zm10.3 3.3 1.4 1.4-6.2 6.2-3.7-3.7 1.4-1.4 2.3 2.3Z',
		slider: 'M3 6h5.2a3 3 0 0 1 5.6 0H21v2h-7.2a3 3 0 0 1-5.6 0H3V6Zm8 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM3 16h1.2a3 3 0 0 1 5.6 0H21v2H9.8a3 3 0 0 1-5.6 0H3v-2Zm5 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
		alignLeft: 'M3 5h18v2.5H3V5Z M3 10h12v2.5H3V10Z M3 15h15v2.5H3V15Z M3 19h9v2.5H3V19Z',
		alignCenter: 'M3 5h18v2.5H3V5Z M6 10h12v2.5H6V10Z M5 15h15v2.5H5V15Z M8 19h9v2.5H8V19Z',
		alignRight: 'M3 5h18v2.5H3V5Z M9 10h12v2.5H9V10Z M6 15h15v2.5H6V15Z M12 19h9v2.5H12V19Z',
		// Distribution icons: a container frame with 1/2/3 filled blocks inside
		// (touching the edges for "between", spread out for "evenly", a single
		// centered block for "around") — a shape/count difference reads at a
		// glance, where three near-identical bars didn't.
		spaceAround: 'M3 3h18v1.5H3V3Z M3 19.5h18v1.5H3V19.5Z M3 3h1.5v18H3V3Z M19.5 3h1.5v18h-1.5V3Z M9 9h6v6H9V9Z',
		spaceBetween: 'M3 3h18v1.5H3V3Z M3 19.5h18v1.5H3V19.5Z M3 3h1.5v18H3V3Z M19.5 3h1.5v18h-1.5V3Z M4.5 9h5v6h-5V9Z M14.5 9h5v6h-5V9Z',
		spaceEvenly: 'M3 3h18v1.5H3V3Z M3 19.5h18v1.5H3V19.5Z M3 3h1.5v18H3V3Z M19.5 3h1.5v18h-1.5V3Z M6 9h3v6H6V9Z M10.5 9h3v6h-3V9Z M15 9h3v6h-3V9Z',
		dots: 'M6 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
		clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 2h2v6.4l4.2 2.5-1 1.7L11 13V6Z',
		chevronDown: 'M12 15.2 5.6 8.8 7 7.4l5 5 5-5 1.4 1.4Z'
	};
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
	<path d={paths[name] ?? ''} />
</svg>
