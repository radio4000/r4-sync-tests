<script>
	import {resolve} from '$app/paths'
	import {getContext} from 'svelte'
	import {toggleChannelPlay} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import {findChannelDeck} from '$lib/deck'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'

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
			<span class="m-chip">
				<span class="m-avatar-clip m-chip-avatar">
					<ChannelAvatar id={channel.image} alt={channel.name} size={64} />
				</span>
				<span class="m-chip-name">{channel.name}</span>
			</span>
		{:else}
			<span class="m-chip muted">{isLoading ? 'Loading…' : `@${slug}`}</span>
		{/if}
	</div>

	<a class="m-ctrl" href={resolve('/m/[slug]/more', {slug})} aria-label="More">
		<Icon icon="options-horizontal" />
	</a>
</header>

<main class="m-scroll m-radio-body">
	{#if channel}
		<button
			type="button"
			class="m-play"
			aria-label={isPlaying ? 'Pause' : 'Play'}
			onclick={onPlay}
		>
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

	.m-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		height: 2.5rem;
		min-height: 2.5rem;
		max-width: 100%;
		padding: 0 var(--space-2) 0 0.2rem;
		border-radius: 999px;
		background: var(--gray-3);
		overflow: hidden;
		box-sizing: border-box;
	}

	.m-chip.muted {
		padding-inline: var(--space-2);
		color: var(--gray-10);
		font-size: var(--font-4);
	}

	.m-chip-avatar {
		width: 2.1rem;
		height: 2.1rem;
	}

	.m-chip-name {
		font-size: var(--font-4);
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding-inline-end: var(--space-1);
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
