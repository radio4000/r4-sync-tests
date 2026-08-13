<script>
	import {resolve} from '$app/paths'
	import {getContext} from 'svelte'
	import {toggleChannelPlay} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import {findChannelDeck} from '$lib/deck'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'
	import {inBag, toggleChannel} from '../bag.svelte.js'

	/** @type {{slug: string, channel?: import('$lib/types').Channel, isLoading: boolean}} */
	const ctx = getContext('m-channel')

	const channel = $derived(ctx.channel)
	const slug = $derived(ctx.slug)
	const isLoading = $derived(ctx.isLoading)

	const deck = $derived(
		channel ? findChannelDeck(appState.decks, appState.active_deck_id, channel.slug) : undefined
	)
	const isPlaying = $derived(Boolean(deck?.is_playing))

	async function onPlay() {
		if (!channel) return
		await toggleChannelPlay({id: channel.id, slug: channel.slug})
	}
</script>

<header class="m-bar m-bar-radio">
	<div class="m-bar-start">
		<a class="m-ctrl" href={resolve('/m')} aria-label="Back">
			<Icon icon="arrow-left" />
		</a>

		{#if channel}
			<a class="m-chip" href={resolve('/m/[slug]/more', {slug})}>
				<span class="m-avatar-clip m-chip-avatar">
					<ChannelAvatar id={channel.image} alt={channel.name} size={64} />
				</span>
				<span class="m-chip-name">{channel.name}</span>
			</a>
		{:else}
			<a class="m-chip muted" href={resolve('/m/[slug]/more', {slug})}
				>{isLoading ? 'Loading…' : `@${slug}`}</a
			>
		{/if}
	</div>

	<div class="m-bar-end">
		{#if channel}
			<button
				type="button"
				class="m-ctrl m-grab"
				class:added={inBag('channel', channel.slug)}
				aria-label="Add {channel.name} to bag"
				onclick={() => toggleChannel(channel)}
			>
				<Icon icon="add" />
			</button>
		{/if}
	</div>
</header>

<main class="m-scroll m-radio-body">
	{#if channel}
		<button type="button" class="m-play" aria-label={isPlaying ? 'Pause' : 'Play'} onclick={onPlay}>
			<Icon icon={isPlaying ? 'pause' : 'play-fill'} size={28} />
			<span>{isPlaying ? 'Pause' : 'Play'}</span>
		</button>

		{#if channel.description}
			<p class="m-desc">{channel.description}</p>
		{/if}
	{:else if isLoading}
		<p class="m-empty">Loading channel…</p>
	{:else}
		<p class="m-empty">Channel not found.</p>
	{/if}
</main>

<style>
	.m-bar-radio {
		justify-content: space-between;
	}

	.m-bar-start {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
		flex: 1;
	}

	.m-bar-end {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		flex-shrink: 0;
	}

	.m-radio-body {
		padding: var(--space-3);
		display: grid;
		gap: var(--space-3);
		align-content: start;
	}

	.m-play {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 3.5rem;
		width: 100%;
		max-width: 16rem;
		padding: 0 var(--space-3);
		border: 0;
		border-radius: 999px;
		background: var(--accent);
		color: var(--gray-1);
		font: inherit;
		font-size: var(--font-5);
		font-weight: 650;
		cursor: pointer;
	}

	.m-desc {
		margin: 0;
		font-size: var(--font-4);
		line-height: 1.5;
		color: var(--gray-11);
		max-width: 36rem;
	}

	.m-radio-body :global(.m-empty) {
		margin: 0;
	}
</style>
