<script>
	let { options, value, onchange } = $props();
</script>

<div class="segmented">
	{#each options as opt (opt.value)}
		<button type="button" class:active={value === opt.value} onclick={() => onchange(opt.value)}>
			{opt.label}
		</button>
	{/each}
</div>
