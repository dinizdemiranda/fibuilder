import data from '../../data/label_options.json';

export const labelDefinitions = data.label_definitions;

export function getLabelById(id) {
	return labelDefinitions.find((l) => l.id === id) ?? null;
}

// Filenames don't follow a derivable slug of the label name/id, so this maps
// each one by hand rather than guessing.
const THUMBNAIL_FILES = {
	shipping_label_4x6: 'outbound-shipping-label.png',
	package_identification_4x2: 'package-identification-label.png',
	multi_package_shipment_4x3: 'multi-package-shipment.png',
	replacement_shipment_4x6: 'replacement-shipment-label.png',
	return_label_4x6: 'customer-return-rma.png'
};

const thumbnailUrls = import.meta.glob('../../data/label_thumbnails/*.png', { eager: true, import: 'default' });

export function getLabelThumbnail(labelId) {
	const filename = THUMBNAIL_FILES[labelId];
	if (!filename) return null;
	return thumbnailUrls[`../../data/label_thumbnails/${filename}`] ?? null;
}

export function formatDimensions(label) {
	const { width, height, unit } = label.dimensions;
	return `${width} × ${height} ${unit}`;
}

// "0.5mm solid #000000" -> { widthMm, style, color }, or null for "0 none transparent"
export function parseBorderSpec(spec) {
	if (!spec) return null;
	const match = /^([\d.]+)\s*mm\s+(\S+)\s+(.+)$/.exec(spec.trim());
	if (!match) return null;
	const widthMm = parseFloat(match[1]);
	const style = match[2];
	const color = match[3];
	if (!widthMm || style === 'none') return null;
	return { widthMm, style, color };
}

// "1mm" -> 1, undefined -> 0
export function parseMm(value) {
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

// "14pt" -> 14
export function parsePt(value) {
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

export function ptToMm(pt) {
	return pt * (25.4 / 72);
}

// Elements author their text as {{field_name}} template bindings, resolved
// at print time. For a structural preview, each field's own `sample_data`
// from label_options.json stands in for the real value.
export function buildSampleBindings(label) {
	const bindings = {};
	for (const field of label.data_sources ?? []) {
		if (field.sample_data !== undefined) bindings[field.name] = String(field.sample_data);
	}
	return bindings;
}

// The small set of inputs that must actually be supplied to look up/print
// this label (e.g. an order id) — a subset of data_sources, by name.
export function isRequiredField(label, fieldName) {
	return (label.required_fields ?? []).some((f) => f.name === fieldName);
}

// data_sources with the actually-required fields (order_id, etc.) pinned to
// the top, for the "Data fields" table shown in the import picker/popover.
export function sortedDataFields(label) {
	return [...(label.data_sources ?? [])].sort((a, b) => {
		const ar = isRequiredField(label, a.name) ? 0 : 1;
		const br = isRequiredField(label, b.name) ? 0 : 1;
		return ar - br;
	});
}

export function resolveTemplate(value, bindings) {
	if (typeof value !== 'string') return value;
	return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => (key in bindings ? bindings[key] : match));
}
