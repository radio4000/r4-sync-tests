<script>
	/** @type {{ count: number }} */
	let {count} = $props()
</script>

{#if count > 0}
	<span class="presence-count" title="{count} listener{count === 1 ? '' : 's'}">
		<span class="icon" aria-hidden="true">◉</span>
		<span>{count}</span>
	</span>
{/if}

<style>
	.presence-count {
		display: inline-flex;
		align-items: center;
		gap: 0.2em;
		color: var(--gray-11);
	}
</style>
