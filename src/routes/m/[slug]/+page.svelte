<script>
	import {resolve} from '$app/paths'
	import {getContext} from 'svelte'
	import {toggleChannelPlay} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import {findChannelDeck} from '$lib/deck'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'

	/** @type {{slug: string, channel?: import('$lib/types').Channel, tracks: import('$lib/types').Track[], isLoading: boolean}} */
	const ctx = getContext('m-channel')

	const channel = $derived(ctx.channel)
	const slug = $derived(ctx.slug)
	const tracks = $derived(ctx.tracks)
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

<header class="m-bar">
	<a class="m-icon-btn" href={resolve('/m')} aria-label="Back">
		<Icon icon="arrow-left" />
	</a>

	{#if channel}
		<a class="m-title-pill" href={resolve('/m/[slug]/more', {slug})}>
			<span class="m-title-avatar">
				<ChannelAvatar id={channel.image} alt={channel.name} size={64} />
			</span>
			<span class="m-title-name">{channel.name}</span>
		</a>
	{:else}
		<span class="m-title-pill muted">{isLoading ? 'Loading…' : `@${slug}`}</span>
	{/if}

	<div class="m-bar-actions">
		<button
			type="button"
			class="m-play-btn"
			aria-label={isPlaying ? 'Pause' : 'Play'}
			disabled={!channel}
			onclick={onPlay}
		>
			<Icon icon={isPlaying ? 'pause' : 'play-fill'} size={22} />
		</button>
		<a
			class="m-icon-btn"
			href={resolve('/m/[slug]/more', {slug})}
			aria-label="More"
		>
			<Icon icon="options-horizontal" />
		</a>
	</div>
</header>

<main class="m-scroll">
	{#if channel}
		<section class="m-card">
			<p class="m-slug">@{channel.slug}</p>
			{#if channel.description}
				<p class="m-desc">{channel.description}</p>
			{:else}
				<p class="m-desc muted">No description.</p>
			{/if}
			<p class="m-meta">{channel.track_count ?? tracks.length} tracks</p>
		</section>

		{#if tracks.length}
			<section class="m-preview">
				<h2>Recent</h2>
				<ul>
					{#each tracks.slice(0, 5) as track (track.id)}
						<li>{track.title || track.url}</li>
					{/each}
				</ul>
				<a class="m-more-link" href={resolve('/m/[slug]/more', {slug})}>See all tracks</a>
			</section>
		{/if}
	{:else if isLoading}
		<p class="m-empty">Loading channel…</p>
	{:else}
		<p class="m-empty">Channel not found.</p>
	{/if}
</main>

<style>
	.m-bar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-2);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-3);
		background: var(--color-interface);
		border-bottom: 1px solid var(--color-interface-border);
		flex-shrink: 0;
	}

	.m-bar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.m-icon-btn,
	.m-play-btn {
		width: 2.5rem;
		height: 2.5rem;
		min-width: 2.5rem;
		min-height: 2.5rem;
		padding: 0;
		border: 1px solid var(--color-interface-border);
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-12);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		cursor: pointer;
	}

	.m-play-btn {
		width: 3rem;
		height: 3rem;
		min-width: 3rem;
		min-height: 3rem;
		border-color: transparent;
		background: var(--accent);
		color: var(--gray-1);
	}

	.m-play-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.m-title-pill {
		justify-self: center;
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		max-width: 100%;
		min-height: 2.5rem;
		padding: 0.2rem var(--space-2) 0.2rem 0.2rem;
		border-radius: 999px;
		background: var(--gray-3);
		color: inherit;
		text-decoration: none;
		overflow: hidden;
	}

	.m-title-pill.muted {
		padding-inline: var(--space-2);
		color: var(--gray-10);
	}

	.m-title-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.m-title-avatar :global(img),
	.m-title-avatar :global(.fallback) {
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
	}

	.m-title-name {
		font-size: var(--font-4);
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding-inline-end: var(--space-1);
	}

	.m-scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: var(--space-3);
		background: var(--gray-2);
	}

	.m-card,
	.m-preview {
		background: var(--color-interface-elevated);
		border: 1px solid var(--color-interface-border);
		border-radius: calc(var(--border-radius) * 2);
		padding: var(--space-3);
	}

	.m-preview {
		margin-top: var(--space-2);
	}

	.m-slug {
		margin: 0 0 var(--space-1);
		color: var(--gray-10);
		font-size: var(--font-3);
	}

	.m-desc {
		margin: 0;
		font-size: var(--font-4);
		line-height: 1.45;
	}

	.m-desc.muted,
	.m-empty {
		color: var(--gray-10);
	}

	.m-meta {
		margin: var(--space-2) 0 0;
		color: var(--gray-10);
		font-size: var(--font-3);
	}

	.m-preview h2 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-4);
		font-weight: 650;
	}

	.m-preview ul {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--gray-11);
		font-size: var(--font-3);
		line-height: 1.55;
	}

	.m-more-link {
		display: inline-block;
		margin-top: var(--space-2);
		font-size: var(--font-3);
		font-weight: 600;
		color: var(--accent);
		text-decoration: none;
	}

	.m-empty {
		margin: 0;
		font-size: var(--font-4);
	}
</style>
