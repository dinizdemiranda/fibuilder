<script>
	import Topbar from '$lib/builder/Topbar.svelte';
	import Library from '$lib/builder/Library.svelte';
	import Canvas from '$lib/builder/Canvas.svelte';
	import PropertiesPanel from '$lib/builder/PropertiesPanel.svelte';
	import PreviewModal from '$lib/builder/PreviewModal.svelte';
	import WorkflowView from '$lib/builder/WorkflowView.svelte';
	import { uiState } from '$lib/builder/state.svelte.js';
</script>

<svelte:head>
	<title>FI Builder</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="true" />
	<link
		href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app-shell">
	<Topbar />
	<div class="app-body">
		<Library />
		{#if uiState.mode === 'workflow'}
			<WorkflowView />
		{:else}
			<Canvas />
			<PropertiesPanel />
		{/if}
	</div>
</div>

{#if uiState.previewOpen}
	<PreviewModal />
{/if}

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
	.app-body {
		flex: 1;
		display: flex;
		min-height: 0;
		position: relative;
	}
</style>
