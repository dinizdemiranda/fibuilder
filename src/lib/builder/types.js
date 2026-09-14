// Definitions for every draggable thing in the component library.
// `defaultProps` describe content/behavior only — appearance is page-level, not per-element.
// `category` distinguishes primitive components (which get the shared hidden/disabled
// visibility fields, added centrally in addElement) from modules (which don't, for now).

export const blockDefs = {
	text: {
		label: 'Text',
		icon: 'text',
		category: 'component',
		defaultProps: {
			content: 'Heading',
			variant: 'heading1',
			align: 'left' // 'left' | 'center' | 'right'
		}
	},
	textfield: {
		label: 'Text Field',
		icon: 'textfield',
		category: 'component',
		defaultProps: {
			label: 'Text Field',
			placeholder: 'Enter a value',
			defaultValue: '',
			multiline: false,
			required: false,
			minLength: '',
			maxLength: ''
		}
	},
	button: {
		label: 'Button',
		icon: 'button',
		category: 'component',
		defaultProps: {
			label: 'Button',
			variant: 'primary', // 'primary' | 'secondary' | 'text'
			size: 'normal', // 'small' | 'normal' | 'large'
			fullWidth: false // hugs its own content by default, like the label/size choices above
		}
	},
	options: {
		label: 'Options',
		icon: 'options',
		category: 'component',
		defaultProps: {
			label: 'Choose an option',
			mode: 'dropdown',
			sourceMode: 'manual', // 'manual' | 'mapped'
			options: ['Option 1', 'Option 2'],
			mappedSourceId: null,
			mappedColumn: null,
			defaultValue: ''
		}
	},
	image: {
		label: 'Image',
		icon: 'image',
		category: 'component',
		defaultProps: {
			src: '',
			alt: 'Image',
			fillHeight: false // stretches to the column (or grid cell) like Data Lookup/Label Preview; otherwise a fixed 220px
		}
	},
	section: {
		label: 'Section',
		icon: 'section',
		category: 'component'
	},
	grid: {
		label: 'Grid',
		icon: 'grid',
		category: 'component'
		// columns/rows/colTracks/rowTracks live top-level on the element itself
		// (see columnGrid.js's defaultGrid(), set in addElement) — same
		// convention as Section's direction/gap/justify/align. fillHeight
		// lives under props like every other module's fill/fixed toggle.
	},
	date: {
		label: 'Date',
		icon: 'calendar',
		category: 'component',
		defaultProps: {
			label: 'Date',
			mode: 'date', // 'date' | 'datetime'
			defaultValue: ''
		}
	},
	divider: {
		label: 'Divider',
		icon: 'divider',
		category: 'component',
		defaultProps: {}
	},
	number: {
		label: 'Number',
		icon: 'number',
		category: 'component',
		defaultProps: {
			label: 'Number',
			mode: 'input', // 'input' | 'slider'
			min: 0,
			max: 100,
			step: 1,
			decimals: false,
			defaultValue: ''
		}
	},
	labelSelector: {
		label: 'Label Selector',
		icon: 'label',
		category: 'module',
		defaultProps: {
			selectedLabelId: null, // falls back to the first imported label when unset
			layout: 'grid' // 'grid' (thumbnail cards, wraps) | 'list' (thumbnail left, name+dims right, stacked)
		}
	},
	labelPreview: {
		label: 'Label Preview',
		icon: 'preview',
		category: 'module',
		defaultProps: {
			fillHeight: true, // 'Fixed' (fixedHeight px) vs 'Fill' the available vertical space
			fixedHeight: 220
		}
	},
	dataLookup: {
		label: 'Data Lookup',
		icon: 'database',
		category: 'module',
		defaultProps: {
			dataSourceId: null,
			columns: [], // every data source column, in display order: [{ name, visible }] — hidden ones sink to the bottom
			filters: [], // [{ id, column, operator, valueMode: 'static'|'reference', value, value2, sourceId, sourceId2 }]
			combinator: 'AND', // 'AND' | 'OR', used once there are 2+ filters
			fillHeight: false, // 'Fixed' (fixedHeight px) vs 'Fill' the available vertical space
			fixedHeight: 200,
			showControls: false // the module's own Reset filters/Refresh buttons — hide when driving it entirely via events
		}
	},
	gallery: {
		label: 'Gallery',
		icon: 'gallery',
		category: 'module',
		defaultProps: {
			dataSourceId: null,
			cardLayout: 'vertical', // 'vertical' | 'horizontal' | 'auto' — see galleryFields.js
			// Ordered, reorderable list of the fixed field set — order is
			// display order. { key, enabled, parts: [{type:'literal',value} |
			// {type:'column',column} | {type:'variable',variableId}] }
			fields: [
				{ key: 'thumbnail', enabled: true, parts: [] },
				{ key: 'title', enabled: true, parts: [] },
				{ key: 'subtitle', enabled: true, parts: [] },
				{ key: 'tag', enabled: true, parts: [] },
				{ key: 'featuredText', enabled: true, parts: [] }
			],
			// Card WIDTH (min 160/max 320px) isn't user-configurable — cards
			// always grow to fill each row with no leftover gap. `rows` is
			// 'auto' or a number — see GalleryElement.svelte for exactly how
			// each combines with fillHeight, but in short: a manual number
			// exactly is how many rows show per page, and with fillHeight on
			// each row's height is then stretched/compressed to make that
			// many rows exactly fill the available space. 'auto' (the
			// default) never stretches — it fits as many naturally-sized
			// rows as the available space allows, adding a row instead of
			// taller ones whenever there's room (with no bound to fit rows
			// *into* — fillHeight off — it just falls back to 2). Either way
			// the grid never scrolls — whatever doesn't fit becomes another
			// page, flipped through with the Back/Next controls.
			fillHeight: false,
			rows: 'auto',
			gap: 16,
			filters: [],
			combinator: 'AND',
			showControls: false
		}
	}
};

export const libraryGroups = [
	{
		title: 'Components',
		items: ['text', 'textfield', 'number', 'date', 'options', 'button', 'image', 'divider', 'section', 'grid']
	},
	{ title: 'Modules', items: ['labelSelector', 'labelPreview', 'dataLookup', 'gallery'] }
];
