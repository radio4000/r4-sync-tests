<script>
	import {resolve} from '$app/paths'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'

	/** @type {{channel?: import('$lib/types').Channel, slug?: string | null, href?: string | undefined, className?: string}} */
	let {channel, slug: slugProp, href, className = ''} = $props()

	let effectiveSlug = $derived(channel?.slug ?? slugProp)
	let linkHref = $derived(
		href ?? (effectiveSlug ? resolve('/[slug]', {slug: effectiveSlug}) : undefined)
	)
</script>

{#if effectiveSlug}
	{#if linkHref}
		<a class={['channel-micro-card', className]} href={linkHref}>
			{#if channel}
				<span class="avatar">
					<ChannelAvatar id={channel.image} alt={channel.name} />
				</span>
			{/if}
			<span class="slug">@{effectiveSlug}</span>
		</a>
	{:else}
		<span class={['channel-micro-card', className]}>
			{#if channel}
				<span class="avatar">
					<ChannelAvatar id={channel.image} alt={channel.name} />
				</span>
			{/if}
			<span class="slug">@{effectiveSlug}</span>
		</span>
	{/if}
{/if}

<style>
	.channel-micro-card {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		min-height: 1.6rem;
		padding: var(--space-1) var(--space-1) var(--space-1) var(--space-1);
		border-radius: var(--border-radius);
		color: inherit;
		text-decoration: none;
		background: var(--gray-2);
		border: 1px solid var(--gray-5);
	}

	.avatar {
		width: var(--track-artwork-size);
		height: var(--track-artwork-size);
		flex-shrink: 0;

		:global(img, svg) {
			width: 100%;
			height: 100%;
			border-radius: calc(var(--border-radius) - 0.2rem);
			object-fit: cover;
		}
	}

	.slug {
		display: block;
		font-size: var(--font-2);
		max-width: 20vw;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
