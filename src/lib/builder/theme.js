// The only place appearance is configurable is the page — these CSS custom
// properties are set once on the page root and every element inherits them.
export function cssVarsString(page) {
	return [
		`--fi-primary:${page.primaryColor}`,
		`--fi-radius:${page.cornerRadius}px`,
		`--fi-font:'Roboto', system-ui, sans-serif`,
		`--fi-surface:#ffffff`,
		`--fi-on-surface:#1a1c1e`,
		`--fi-on-surface-variant:#5a5f68`,
		`--fi-outline:#c9cdd4`
	].join(';');
}
