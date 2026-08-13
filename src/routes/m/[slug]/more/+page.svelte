<script>
	import {resolve} from '$app/paths'
	import {getContext} from 'svelte'
	import Icon from '$lib/components/icon.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'

	/** @type {{slug: string, channel?: import('$lib/types').Channel, tracks: import('$lib/types').Track[], isLoading: boolean}} */
	const ctx = getContext('m-channel')

	const channel = $derived(ctx.channel)
	const slug = $derived(ctx.slug)
	const tracks = $derived(ctx.tracks)
	const isLoading = $derived(ctx.isLoading)
</script>

<header class="m-bar m-bar-more">
	<a class="m-ctrl" href={resolve('/m/[slug]', {slug})} aria-label="Back">
		<Icon icon="arrow-left" />
	</a>

	{#if channel}
		<a class="m-chip" href={resolve('/m/[slug]', {slug})}>
			<span class="m-avatar-clip m-chip-avatar">
				<ChannelAvatar id={channel.image} alt={channel.name} size={64} />
			</span>
			<span class="m-chip-name">{channel.name}</span>
		</a>
	{:else}
		<a class="m-chip muted" href={resolve('/m/[slug]', {slug})}
			>{isLoading ? 'Loading…' : `@${slug}`}</a
		>
	{/if}
</header>

<main class="m-scroll">
	{#if tracks.length}
		<Tracklist {tracks} playlistTitle={channel?.name} playContext />
	{:else if isLoading || !channel}
		<p class="m-empty">
			{channel ? 'Loading tracks…' : isLoading ? 'Loading…' : 'Channel not found.'}
		</p>
	{:else}
		<p class="m-empty">No tracks yet.</p>
	{/if}
</main>
