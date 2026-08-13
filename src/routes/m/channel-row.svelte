<script>
	import {resolve} from '$app/paths'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'

	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/types').Channel} channel
	 */

	/** @type {Props} */
	const {channel} = $props()
</script>

<a class="m-row" href={resolve('/m/[slug]', {slug: channel.slug})}>
	<span class="m-row-avatar">
		<ChannelAvatar id={channel.image} alt={channel.name} size={96} />
	</span>
	<span class="m-row-body">
		<span class="m-row-top">
			<span class="m-row-name">{channel.name}</span>
			{#if channel.slug}
				<span class="m-row-pill">@{channel.slug}</span>
			{/if}
		</span>
		{#if channel.description}
			<span class="m-row-sub">{channel.description}</span>
		{:else if channel.track_count != null}
			<span class="m-row-sub">{channel.track_count} tracks</span>
		{/if}
	</span>
</a>

<style>
	.m-row {
		display: grid;
		grid-template-columns: 3.25rem 1fr;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) var(--space-3);
		color: inherit;
		text-decoration: none;
		min-height: 4.25rem;
	}

	.m-row-avatar {
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 999px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--gray-3);
	}

	.m-row-avatar :global(img),
	.m-row-avatar :global(.fallback) {
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
	}

	.m-row-body {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
		padding-block: var(--space-1);
		border-bottom: 1px solid var(--color-interface-border);
		align-self: stretch;
		align-content: center;
	}

	.m-row:last-child .m-row-body {
		border-bottom: 0;
	}

	.m-row-top {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
	}

	.m-row-name {
		font-size: var(--font-5);
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.m-row-pill {
		flex-shrink: 0;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-10);
		font-size: var(--font-2);
		font-weight: 500;
	}

	.m-row-sub {
		color: var(--gray-10);
		font-size: var(--font-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
