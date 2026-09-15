<script>
	import { doc, uiState, clearCanvas } from './state.svelte.js';
	import { PROJECTS, loadProject } from './projects.js';
	import Icon from './Icon.svelte';
	import DocJsonModal from './DocJsonModal.svelte';
	import SystemPromptModal from './SystemPromptModal.svelte';
	import ApiLogModal from './ApiLogModal.svelte';
	import OrientationToggle from './OrientationToggle.svelte';

	let pageMenuOpen = $state(false);
	let confirmClearOpen = $state(false);
	let jsonModalOpen = $state(false);
	let systemPromptModalOpen = $state(false);
	let apiLogModalOpen = $state(false);

	let editingTitle = $state(false);
	// svelte-ignore state_referenced_locally -- seeds the draft once; the effect below resyncs on every doc.page.title change
	let titleDraft = $state(doc.page.title);
	let titleInputEl = $state(null);

	$effect(() => {
		titleDraft = doc.page.title;
		editingTitle = false;
	});

	$effect(() => {
		if (editingTitle && titleInputEl) {
			titleInputEl.focus();
			titleInputEl.select();
		}
	});

	function startEditTitle() {
		titleDraft = doc.page.title;
		editingTitle = true;
	}

	function commitTitle() {
		const trimmed = titleDraft.trim();
		if (trimmed) doc.page.title = trimmed;
		editingTitle = false;
	}

	function cancelTitle() {
		titleDraft = doc.page.title;
		editingTitle = false;
	}

	function openClearConfirm() {
		pageMenuOpen = false;
		confirmClearOpen = true;
	}

	function openJsonModal() {
		pageMenuOpen = false;
		jsonModalOpen = true;
	}

	function openSystemPromptModal() {
		pageMenuOpen = false;
		systemPromptModalOpen = true;
	}

	function openApiLogModal() {
		pageMenuOpen = false;
		apiLogModalOpen = true;
	}

	function selectProject(id) {
		pageMenuOpen = false;
		loadProject(id);
	}

	function doClearCanvas() {
		clearCanvas();
		confirmClearOpen = false;
	}
</script>

<header class="topbar">
	<div class="topbar-side">
		<div class="brand-wrap">
			<div class="brand">FI Builder</div>
			<button type="button" class="brand-menu-btn" onclick={() => (pageMenuOpen = !pageMenuOpen)}>
				<Icon name="chevronDown" size={13} />
			</button>
			{#if pageMenuOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="page-menu-backdrop" onclick={() => (pageMenuOpen = false)}></div>
				<div class="page-menu">
					<div class="page-menu-heading">Recent projects</div>
					{#each PROJECTS as project (project.id)}
						<button type="button" class="page-menu-item" onclick={() => selectProject(project.id)}>
							<Icon name="folder" size={13} />
							<span class="page-menu-item-label">{project.name}</span>
							{#if doc.activeProjectId === project.id}
								<Icon name="check" size={12} />
							{/if}
						</button>
					{/each}
					<div class="page-menu-divider"></div>
					<button type="button" class="page-menu-item" onclick={openJsonModal}>
						<Icon name="copy" size={13} />
						See JSON
					</button>
					<button type="button" class="page-menu-item" onclick={openSystemPromptModal}>
						<Icon name="assistant" size={13} />
						System prompt
					</button>
					<button type="button" class="page-menu-item" onclick={openApiLogModal}>
						<Icon name="clock" size={13} />
						AI responses
					</button>
					<button type="button" class="page-menu-item page-menu-item--danger" onclick={openClearConfirm}>
						<Icon name="trash" size={13} />
						Clear canvas
					</button>
				</div>
			{/if}
		</div>
		{#if editingTitle}
			<input
				bind:this={titleInputEl}
				class="page-name-input"
				type="text"
				bind:value={titleDraft}
				onblur={commitTitle}
				onkeydown={(e) => {
					if (e.key === 'Enter') commitTitle();
					if (e.key === 'Escape') cancelTitle();
				}}
			/>
		{:else}
			<button type="button" class="page-name" onclick={startEditTitle} data-tooltip="Click to rename">
				{doc.page.title}
			</button>
		{/if}
	</div>
	<div class="topbar-center">
		<div class="mode-toggle">
			<button type="button" class:active={uiState.mode === 'design'} onclick={() => (uiState.mode = 'design')}>
				Design
			</button>
			<button type="button" class:active={uiState.mode === 'workflow'} onclick={() => (uiState.mode = 'workflow')}>
				Data Pipeline
			</button>
		</div>
	</div>
	<div class="topbar-side topbar-right">
		<OrientationToggle value={doc.page.orientation} onchange={(v) => (doc.page.orientation = v)} />
		<button type="button" class="preview-btn" onclick={() => (uiState.previewOpen = true)}>Preview</button>
	</div>
</header>

{#if jsonModalOpen}
	<DocJsonModal onclose={() => (jsonModalOpen = false)} />
{/if}

{#if systemPromptModalOpen}
	<SystemPromptModal onclose={() => (systemPromptModalOpen = false)} />
{/if}

{#if apiLogModalOpen}
	<ApiLogModal onclose={() => (apiLogModalOpen = false)} />
{/if}

{#if confirmClearOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="cc-overlay" onclick={() => (confirmClearOpen = false)}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="cc-shell" onclick={(e) => e.stopPropagation()}>
			<h2 class="cc-title">Clear canvas?</h2>
			<p class="cc-body">
				This removes every component, variable, and workflow connection on this page. Imported labels and data
				sources are kept. This can't be undone.
			</p>
			<div class="cc-footer">
				<button type="button" class="cc-btn cc-btn-cancel" onclick={() => (confirmClearOpen = false)}>Cancel</button>
				<button type="button" class="cc-btn cc-btn-danger" onclick={doClearCanvas}>Clear canvas</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.topbar {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 52px;
		flex-shrink: 0;
		padding: 0 16px;
		background: #1a1c1e;
		color: #fff;
		font-family: system-ui, sans-serif;
	}
	.topbar-side {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}
	.topbar-right {
		justify-content: flex-end;
	}
	.topbar-center {
		flex: 0 0 auto;
	}
	.brand-wrap {
		position: relative;
		display: flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}
	.brand {
		font-weight: 600;
		font-size: 14px;
		letter-spacing: 0.02em;
	}
	.brand-menu-btn {
		width: 20px;
		height: 20px;
		border-radius: 5px;
		border: none;
		background: none;
		color: rgba(255, 255, 255, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.brand-menu-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	.page-name {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.6);
		padding: 3px 6px;
		margin-left: 10px;
		border-left: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		background: none;
		border-top: none;
		border-right: none;
		border-bottom: none;
		font-family: inherit;
		cursor: text;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
	.page-name:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}
	.page-name-input {
		font-size: 13px;
		font-family: inherit;
		color: #1a1c1e;
		padding: 3px 6px;
		margin-left: 10px;
		border: 1px solid #0b57d0;
		border-radius: 4px;
		background: #fff;
		outline: none;
		min-width: 0;
		flex: 1;
		max-width: 240px;
	}
	.mode-toggle {
		display: flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 3px;
		gap: 2px;
	}
	.mode-toggle button {
		border: none;
		background: none;
		color: rgba(255, 255, 255, 0.65);
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 6px 16px;
		border-radius: 6px;
		cursor: pointer;
	}
	.mode-toggle button:hover {
		color: #fff;
	}
	.mode-toggle button.active {
		background: #fff;
		color: #1a1c1e;
	}
	.preview-btn {
		background: #0b57d0;
		color: #fff;
		border: none;
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 7px 16px;
		border-radius: 6px;
		cursor: pointer;
	}
	.preview-btn:hover {
		background: #0a4bb8;
	}
	.page-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
	}
	.page-menu {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 1001;
		width: 180px;
		background: #fff;
		border: 1px solid #e2e4e8;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
		padding: 4px;
		font-family: system-ui, sans-serif;
	}
	.page-menu-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		border: none;
		background: none;
		padding: 8px 10px;
		border-radius: 5px;
		font-family: inherit;
		font-size: 12.5px;
		color: #1a1c1e;
		cursor: pointer;
		text-align: left;
	}
	.page-menu-item:hover {
		background: #f0f1f3;
	}
	.page-menu-item-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.page-menu-heading {
		padding: 6px 10px 4px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #8a8f98;
	}
	.page-menu-divider {
		height: 1px;
		background: #e2e4e8;
		margin: 4px 0;
	}
	.page-menu-item--danger {
		color: #b3261e;
	}
	.page-menu-item--danger:hover {
		background: #fef2f2;
	}
	.cc-overlay {
		position: fixed;
		inset: 0;
		background: rgba(20, 21, 23, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 32px;
	}
	.cc-shell {
		width: 100%;
		max-width: 380px;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		box-sizing: border-box;
		padding: 22px;
		font-family: system-ui, sans-serif;
	}
	.cc-title {
		margin: 0 0 10px;
		font-size: 15px;
		font-weight: 600;
		color: #1a1c1e;
	}
	.cc-body {
		margin: 0 0 20px;
		font-size: 12.5px;
		line-height: 1.5;
		color: #5a5f68;
	}
	.cc-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.cc-btn {
		font-family: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 8px 18px;
		border-radius: 6px;
		cursor: pointer;
	}
	.cc-btn-cancel {
		background: #fff;
		color: #1a1c1e;
		border: 1px solid #c9cdd4;
	}
	.cc-btn-cancel:hover {
		background: #f5f5f6;
	}
	.cc-btn-danger {
		background: #b3261e;
		color: #fff;
		border: none;
	}
	.cc-btn-danger:hover {
		background: #96201a;
	}
</style>
