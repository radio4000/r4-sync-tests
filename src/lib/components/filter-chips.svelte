<script lang="ts">
	/** Removable chips showing the active filter selection — same UI wherever tags can be filtered. */
	let {
		tags = [],
		channels = [],
		matching = '',
		search = '',
		onRemoveTag,
		onRemoveChannel,
		onClearMatching
	}: {
		tags?: string[]
		channels?: string[]
		matching?: string
		search?: string
		onRemoveTag?: (tag: string) => void
		onRemoveChannel?: (slug: string) => void
		onClearMatching?: () => void
	} = $props()
</script>

<menu class="row filter-chips">
	{#if search}
		<span class="chip">"{search}"</span>
	{/if}
	{#if matching}
		<button type="button" class="chip" onclick={onClearMatching}>@{matching} ×</button>
	{/if}
	{#each channels as slug (slug)}
		<button type="button" class="chip" onclick={() => onRemoveChannel?.(slug)}>@{slug} ×</button>
	{/each}
	{#each tags as tag (tag)}
		<button type="button" class="chip" onclick={() => onRemoveTag?.(tag)}>#{tag} ×</button>
	{/each}
</menu>

<style>
	.filter-chips {
		flex-wrap: wrap;
		gap: var(--space-1);
	}
</style>
