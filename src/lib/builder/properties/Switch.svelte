<script>
	let { checked = $bindable(false), disabled = false } = $props();
</script>

<label class="switch" class:disabled>
	<input type="checkbox" bind:checked {disabled} />
	<span class="switch-track"><span class="switch-thumb"></span></span>
</label>

<style>
	.switch {
		position: relative;
		display: inline-flex;
		align-items: center;
		cursor: pointer;
		flex-shrink: 0;
	}
	.switch input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}
	.switch-track {
		width: 34px;
		height: 20px;
		border-radius: 999px;
		background: #d3d6db;
		position: relative;
		display: inline-block;
		transition: background 0.15s ease;
	}
	.switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
		transition: transform 0.15s ease;
	}
	.switch input:checked + .switch-track {
		background: #0b57d0;
	}
	.switch input:checked + .switch-track .switch-thumb {
		transform: translateX(14px);
	}
	.switch.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
