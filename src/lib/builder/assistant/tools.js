// Tool definitions the assistant can call — shared between the server route
// (wraps these into OpenAI's function-calling shape) and runTool.js (the
// browser-only dispatcher that actually executes them against `doc`).
//
// Deliberately free of any import from state.svelte.js/bindings.js/etc. —
// those are browser-only concerns (a live, reactive `doc`), and this file is
// also read by the server route. The small static lists below mirror the
// real source of truth (types.js/variables.js/events.js) by hand; if one of
// those files' shapes changes, update the matching list here too.

// Mirrors blockDefs' keys (types.js).
export const ELEMENT_TYPES = [
	'text',
	'textfield',
	'number',
	'date',
	'options',
	'button',
	'image',
	'divider',
	'section',
	'grid',
	'labelSelector',
	'labelPreview',
	'dataLookup',
	'gallery'
];

// Mirrors VARIABLE_TYPES' values (variables.js).
export const VARIABLE_TYPES = ['string', 'number', 'boolean', 'date'];

// Mirrors CONTROL_METHODS (events.js) — which control methods each
// controllable element type accepts.
export const CONTROL_METHODS = {
	textfield: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	number: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	date: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	options: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'],
	text: ['setValue', 'toggleVisibility'],
	labelSelector: ['setValue'],
	image: ['setValue', 'toggleVisibility'],
	dataLookup: ['refresh', 'resetFilters']
};

export const GALLERY_FIELD_KEYS = ['thumbnail', 'title', 'subtitle', 'tag', 'featuredText'];

const el = (extra = {}, required = []) => ({
	type: 'object',
	properties: { elementId: { type: 'string', description: 'id of an element from the current page snapshot' }, ...extra },
	required: ['elementId', ...required]
});

// Each entry: { name, description, parameters } — plain JSON Schema, no
// OpenAI `{type:'function', function:{...}}` wrapper (the server route adds
// that), so these stay reusable as-is if this ever needs to be exposed to a
// different tool-calling client later.
export const TOOL_DEFS = [
	{
		name: 'add_element',
		description:
			'Add a new component/module to the page. Places at the end of the target container unless index is given. A Section may nest one level inside a Grid; nothing else nests — an illegal request silently falls back to the page root and the result will say so.',
		parameters: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: ELEMENT_TYPES,
					description:
						'"text" = static, read-only text/heading (NOT an input — use "textfield" for an editable text input). ' +
						'"textfield" = editable single-line text input. "number" = numeric input, optionally a +/- counter. ' +
						'"date" = date picker input. "options" = a choice input (dropdown/radio/checkbox/button group). ' +
						'"button" = clickable, can trigger events. "image" = shows an image. "divider" = a visual separator line. ' +
						'"section"/"grid" = layout containers. "labelSelector"/"labelPreview" = pick/preview a label design. ' +
						'"dataLookup" = searchable table against a data source. "gallery" = card grid against a data source.'
				},
				containerId: {
					type: ['string', 'null'],
					description: 'null = column A (default), "colB" = column B, or the id of a Section/Grid to place it inside'
				},
				index: { type: 'integer', description: 'position within the container; omit to append at the end' }
			},
			required: ['type']
		}
	},
	{
		name: 'move_element',
		description: 'Move an existing element to a different container/position. Same nesting rules and fallback behavior as add_element.',
		parameters: el({
			containerId: { type: ['string', 'null'] },
			index: { type: 'integer' }
		})
	},
	{
		name: 'remove_element',
		description: 'Remove an element from the page.',
		parameters: el()
	},
	{
		name: 'rename_element',
		description: "Rename an element (its label in the Objects panel, not any visible text). Fails if the name is blank or already used.",
		parameters: el({ name: { type: 'string' } }, ['name'])
	},
	{
		name: 'set_section_layout',
		description: 'Set a Section element\'s own layout fields (not props — Sections store these top-level).',
		parameters: el({
			direction: { type: 'string', enum: ['horizontal', 'vertical'] },
			itemSizing: { type: 'string', enum: ['auto', 'fill'] },
			justify: { type: 'string', enum: ['left', 'center', 'right', 'around', 'between', 'evenly'] },
			align: { type: 'string', enum: ['start', 'center', 'end'] },
			gap: { type: 'integer' }
		})
	},
	{
		name: 'set_grid_layout',
		description: "Resize a Grid element's column/row count. Existing children are kept if their cell still exists after the resize, otherwise dropped — never silently corrupted.",
		parameters: el({
			columns: { type: 'integer', minimum: 1, maximum: 12 },
			rows: { type: 'integer', minimum: 1, maximum: 12 }
		})
	},
	{
		name: 'set_field_value',
		description:
			'Set one of an element\'s fields to a fixed value (clears any reference/formula previously set on that field). Only fields that already exist on that element type are accepted.',
		parameters: el({ field: { type: 'string' }, value: {} }, ['field', 'value'])
	},
	{
		name: 'set_field_reference',
		description: "Make a field always mirror another component's or variable's current value.",
		parameters: el({ field: { type: 'string' }, sourceId: { type: 'string' } }, ['field', 'sourceId'])
	},
	{
		name: 'set_field_formula',
		description:
			'Make a field compute its value from a single-line JS expression referencing other components/variables. refs maps the plain identifier names used in code to the source ids they read from — e.g. code "quantity * price" needs refs {"quantity": "<id>", "price": "<id>"}.',
		parameters: el(
			{
				field: { type: 'string' },
				code: { type: 'string', description: 'a single JS expression, e.g. "quantity * price" or "total > 100 ? \'Free\' : \'Standard\'"' },
				refs: { type: 'object', additionalProperties: { type: 'string' }, description: 'identifier name -> source element/variable id' }
			},
			['field', 'code']
		)
	},
	{
		name: 'clear_field_binding',
		description: 'Remove a reference/formula from a field, leaving whatever static value is underneath.',
		parameters: el({ field: { type: 'string' } }, ['field'])
	},
	{
		name: 'create_variable',
		description: 'Create a new page variable. If the name is already taken it gets uniquified automatically — check the result for the actual name used.',
		parameters: {
			type: 'object',
			properties: {
				name: { type: 'string' },
				type: { type: 'string', enum: VARIABLE_TYPES },
				value: { type: 'string', description: 'initial static value; omit for the type\'s default' }
			},
			required: ['name', 'type']
		}
	},
	{
		name: 'remove_variable',
		description: 'Remove a page variable.',
		parameters: { type: 'object', properties: { variableId: { type: 'string' } }, required: ['variableId'] }
	},
	{
		name: 'set_variable_value',
		description: 'Set a variable to a fixed value (clears any formula previously set).',
		parameters: {
			type: 'object',
			properties: { variableId: { type: 'string' }, value: { type: 'string' } },
			required: ['variableId', 'value']
		}
	},
	{
		name: 'set_variable_formula',
		description:
			'Give a variable a computed value via a single-line JS expression (same code/refs convention as set_field_formula). For a date-typed variable only: baseDate (an ISO "YYYY-MM-DD") is used as the base the formula\'s result is treated as a day-offset from — omit to use today.',
		parameters: {
			type: 'object',
			properties: {
				variableId: { type: 'string' },
				code: { type: 'string' },
				refs: { type: 'object', additionalProperties: { type: 'string' } },
				baseDate: { type: 'string', description: 'date-typed variables only, "YYYY-MM-DD"' }
			},
			required: ['variableId', 'code']
		}
	},
	{
		name: 'add_button_control_event',
		description: "Add a click event on a Button that controls another component (set/clear its value, or toggle enabled/visible).",
		parameters: {
			type: 'object',
			properties: {
				buttonId: { type: 'string' },
				targetId: { type: 'string' },
				method: { type: 'string', enum: ['clearValue', 'setValue', 'toggleEnabled', 'toggleVisibility'] },
				value: { type: 'string', description: 'required when method is setValue' },
				direction: {
					type: 'string',
					enum: ['enable', 'disable', 'hide', 'show'],
					description: 'required when method is toggleEnabled (enable/disable) or toggleVisibility (hide/show)'
				}
			},
			required: ['buttonId', 'targetId', 'method']
		}
	},
	{
		name: 'add_button_set_variable_event',
		description: 'Add a click event on a Button that sets, clears, or resets a variable.',
		parameters: {
			type: 'object',
			properties: {
				buttonId: { type: 'string' },
				variableId: { type: 'string' },
				varMethod: { type: 'string', enum: ['set', 'clear', 'resetToDefault'] },
				value: { type: 'string', description: 'required when varMethod is set' }
			},
			required: ['buttonId', 'variableId', 'varMethod']
		}
	},
	{
		name: 'add_row_select_event',
		description:
			"Add an On Select event on a Data Lookup or Gallery — when a row is picked, copies one of that row's columns into a target field or variable.",
		parameters: {
			type: 'object',
			properties: {
				moduleId: { type: 'string' },
				action: { type: 'string', enum: ['controlComponent', 'setVariable'] },
				targetId: { type: 'string', description: 'required when action is controlComponent' },
				variableId: { type: 'string', description: 'required when action is setVariable' },
				column: { type: 'string' }
			},
			required: ['moduleId', 'action', 'column']
		}
	},
	{
		name: 'remove_event',
		description: 'Remove an event from an element.',
		parameters: el({ eventId: { type: 'string' } }, ['eventId'])
	},
	{
		name: 'set_module_data_source',
		description: 'Set which data source a Data Lookup, Gallery, or mapped Options component reads from.',
		parameters: el({ dataSourceId: { type: 'string' } }, ['dataSourceId'])
	},
	{
		name: 'get_data_source_sample',
		description: "Look up a data source's columns and a few example distinct values per column — use before wiring filters/fields to it if you're unsure what it contains.",
		parameters: {
			type: 'object',
			properties: { dataSourceId: { type: 'string' } },
			required: ['dataSourceId']
		}
	},
	{
		name: 'set_gallery_field',
		description:
			"Configure one of a Gallery's fixed card fields. parts is the same literal+column+variable template as everywhere else: [{type:'literal',value},{type:'column',column},{type:'variable',variableId}], concatenated in order.",
		parameters: el(
			{
				key: { type: 'string', enum: GALLERY_FIELD_KEYS },
				enabled: { type: 'boolean' },
				parts: { type: 'array', items: { type: 'object' } }
			},
			['key', 'enabled']
		)
	},
	{
		name: 'import_label',
		description: 'Import a label design into the project so it becomes usable in Label Selector/Label Preview modules.',
		parameters: { type: 'object', properties: { labelId: { type: 'string' } }, required: ['labelId'] }
	},
	{
		name: 'remove_label',
		description: 'Remove an imported label from the project.',
		parameters: { type: 'object', properties: { labelId: { type: 'string' } }, required: ['labelId'] }
	},
	{
		name: 'ask_question',
		description:
			'Ask the user a single clarifying/decision question and stop to wait for their answer. Use this — never plain conversational text — any time you need them to decide something before you continue (which fields to show, which of two reasonable approaches, whether to proceed to the next phase of a larger build, etc). Ask ONE question at a time: if you have several, ask the first and wait for the reply before asking the next.',
		parameters: {
			type: 'object',
			properties: {
				question: { type: 'string' },
				options: {
					type: 'array',
					items: { type: 'string' },
					maxItems: 5,
					description: "Short choice labels (at most 5) if this is a pick-one question, e.g. [\"Continue\", \"Stop here\"]. Omit entirely for an open-ended question."
				}
			},
			required: ['question']
		}
	},
	{
		name: 'present_plan',
		description:
			'Show the user a short, structured plan before starting a multi-phase build — call this once, before the first tool call of the build, instead of writing the plan out as plain text. 2-5 phases, each a few words, plain everyday language (no internal tool/field names). Do not call this for a small, single-step change.',
		parameters: {
			type: 'object',
			properties: {
				phases: {
					type: 'array',
					minItems: 2,
					maxItems: 5,
					items: {
						type: 'object',
						properties: {
							title: { type: 'string', description: 'a few words, e.g. "Add the layout and fields"' },
							detail: { type: 'string', description: 'optional, one short plain-language sentence at most' }
						},
						required: ['title']
					}
				}
			},
			required: ['phases']
		}
	}
];
