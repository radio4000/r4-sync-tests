<script>
	import {resolve} from '$app/paths'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'

	/** @type {{channel: import('$lib/types').Channel}} */
	const {channel} = $props()
</script>

<a class="m-channel" href={resolve('/m/[slug]', {slug: channel.slug})}>
	<span class="m-avatar-clip m-channel-avatar">
		<ChannelAvatar id={channel.image} alt={channel.name} size={96} />
	</span>
	<span class="m-channel-body">
		<span class="m-channel-top">
			<span class="m-channel-name">{channel.name}</span>
			{#if channel.slug}
				<span class="m-channel-pill">@{channel.slug}</span>
			{/if}
		</span>
		{#if channel.description}
			<span class="m-channel-sub">{channel.description}</span>
		{:else if channel.track_count != null}
			<span class="m-channel-sub">{channel.track_count} tracks</span>
		{/if}
	</span>
</a>

<style>
	.m-channel {
		display: grid;
		grid-template-columns: 3.25rem 1fr;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) var(--space-3);
		color: inherit;
		text-decoration: none;
		min-height: 4.25rem;
	}

	.m-channel-avatar {
		width: 3.25rem;
		height: 3.25rem;
	}

	.m-channel-body {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
		padding-block: var(--space-1);
		border-bottom: 1px solid var(--color-interface-border);
		align-self: stretch;
		align-content: center;
	}

	:global(li:last-child) .m-channel-body {
		border-bottom: 0;
	}

	.m-channel-top {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
	}

	.m-channel-name {
		font-size: var(--font-5);
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.m-channel-pill {
		flex-shrink: 0;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-10);
		font-size: var(--font-2);
		font-weight: 500;
	}

	.m-channel-sub {
		color: var(--gray-10);
		font-size: var(--font-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
