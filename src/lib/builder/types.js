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
			size: 'normal' // 'small' | 'normal' | 'large'
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
			alt: 'Image'
		}
	},
	section: {
		label: 'Section',
		icon: 'section',
		category: 'component'
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
	}
};

export const libraryGroups = [
	{
		title: 'Components',
		items: ['text', 'textfield', 'number', 'date', 'options', 'button', 'image', 'divider', 'section']
	},
	{ title: 'Modules', items: ['labelSelector', 'labelPreview', 'dataLookup'] }
];
