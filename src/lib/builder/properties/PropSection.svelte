<script>
	import Icon from '../Icon.svelte';

	let { title, defaultOpen = true, children } = $props();
	// svelte-ignore state_referenced_locally -- defaultOpen only seeds initial state, by design
	let open = $state(defaultOpen);
</script>

<div class="prop-section">
	<button type="button" class="prop-section-header" onclick={() => (open = !open)}>
		<span class="prop-section-title">{title}</span>
		<span class="prop-section-chevron" class:open><Icon name="chevron" size={12} /></span>
	</button>
	{#if open}
		<div class="prop-section-body">
			{@render children()}
		</div>
	{/if}
</div>
