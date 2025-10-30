<script lang="ts">
	let { message = $bindable('') } = $props();
</script>

<div
	class="sr-only"
	role="status"
	aria-live="polite"
	aria-atomic="true"
>
	{message}
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
