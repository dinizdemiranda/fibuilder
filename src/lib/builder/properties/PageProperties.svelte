<script>
	import { doc } from '../state.svelte.js';
	import { PAGE_SIZE_PRESETS } from '../layout.js';
	import PropSection from './PropSection.svelte';
	import Switch from './Switch.svelte';
	import '../properties/panel.css';
</script>

<PropSection title="Page">
	<div class="prop-field">
		<label class="prop-label" for="page-title">Title</label>
		<input id="page-title" class="ctrl-text" type="text" bind:value={doc.page.title} />
	</div>
	<div class="prop-field">
		<label class="prop-label" for="page-size">Size</label>
		<select id="page-size" class="ctrl-select" bind:value={doc.page.pageSize}>
			{#each PAGE_SIZE_PRESETS as preset (preset.id)}
				<option value={preset.id}>{preset.label}</option>
			{/each}
		</select>
	</div>
</PropSection>

<PropSection title="Appearance">
	<div class="prop-field">
		<label class="prop-label" for="page-bg">Background</label>
		<div class="ctrl-row">
			<input id="page-bg" class="ctrl-color" type="color" bind:value={doc.page.background} />
			<input class="ctrl-text" type="text" bind:value={doc.page.background} />
		</div>
	</div>
	<div class="prop-field">
		<label class="prop-label" for="page-primary">Primary color</label>
		<div class="ctrl-row">
			<input id="page-primary" class="ctrl-color" type="color" bind:value={doc.page.primaryColor} />
			<input class="ctrl-text" type="text" bind:value={doc.page.primaryColor} />
		</div>
	</div>
	<div class="prop-field">
		<label class="prop-label" for="page-radius">Corner radius: {doc.page.cornerRadius}px</label>
		<input id="page-radius" type="range" min="0" max="24" bind:value={doc.page.cornerRadius} />
	</div>
</PropSection>

<PropSection title="Layout">
	<!-- Column count is now controlled from the column itself (select or
	     hover it on the canvas to add/remove a column), and its proportions
	     via the drag handle that appears between two columns — see
	     Canvas.svelte. -->
	<div class="prop-field prop-field-row">
		<span class="prop-label">Show divider</span>
		<Switch bind:checked={doc.page.showColumnDivider} disabled={doc.page.columns !== 2} />
	</div>
	<div class="prop-field prop-field-row">
		<span class="prop-label">Scroll independently</span>
		<Switch bind:checked={doc.page.scrollIndependently} disabled={doc.page.columns !== 2} />
	</div>
</PropSection>

<PropSection title="Footer">
	<div class="prop-field prop-field-row">
		<span class="prop-label">Hide footer</span>
		<Switch bind:checked={doc.page.footer.hidden} />
	</div>
	<div class="prop-field prop-field-row">
		<span class="prop-label">Show secondary button</span>
		<Switch bind:checked={doc.page.footer.showSecondary} disabled={doc.page.footer.hidden} />
	</div>
	<div class="prop-field">
		<label class="prop-label" for="footer-secondary-label">Secondary label</label>
		<input
			id="footer-secondary-label"
			class="ctrl-text"
			type="text"
			bind:value={doc.page.footer.secondaryLabel}
			disabled={doc.page.footer.hidden || !doc.page.footer.showSecondary}
		/>
	</div>
	<div class="prop-field prop-field-row">
		<span class="prop-label">Show text button</span>
		<Switch bind:checked={doc.page.footer.showText} disabled={doc.page.footer.hidden} />
	</div>
	<div class="prop-field">
		<label class="prop-label" for="footer-text-label">Text label</label>
		<input
			id="footer-text-label"
			class="ctrl-text"
			type="text"
			bind:value={doc.page.footer.textLabel}
			disabled={doc.page.footer.hidden || !doc.page.footer.showText}
		/>
	</div>
	<div class="prop-field">
		<label class="prop-label" for="footer-primary-label">Primary label</label>
		<input
			id="footer-primary-label"
			class="ctrl-text"
			type="text"
			bind:value={doc.page.footer.primaryLabel}
			disabled={doc.page.footer.hidden}
		/>
	</div>
</PropSection>
