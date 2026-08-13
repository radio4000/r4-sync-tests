<script>
	import {resolve} from '$app/paths'
	import {getContext} from 'svelte'
	import {playChannel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'

	/** @type {{slug: string, channel?: import('$lib/types').Channel, tracks: import('$lib/types').Track[], isLoading: boolean}} */
	const ctx = getContext('m-channel')

	const channel = $derived(ctx.channel)
	const slug = $derived(ctx.slug)
	const tracks = $derived(ctx.tracks)
	const isLoading = $derived(ctx.isLoading)

	/** @param {import('$lib/types').Track} track */
	async function playTrack(track) {
		if (!channel) return
		await playChannel(appState.active_deck_id, {id: channel.id, slug: channel.slug}, track.id)
	}
</script>

<header class="m-bar">
	<a class="m-icon-btn" href={resolve('/m/[slug]', {slug})} aria-label="Back">
		<Icon icon="arrow-left" />
	</a>
	<h1>Channel</h1>
	<a class="m-icon-btn" href={resolve('/[slug]', {slug})} aria-label="Open full channel">
		<Icon icon="radio" />
	</a>
</header>

<main class="m-scroll">
	{#if channel}
		<section class="m-info">
			<span class="m-info-avatar">
				<ChannelAvatar id={channel.image} alt={channel.name} size={160} />
			</span>
			<div>
				<h2>{channel.name}</h2>
				<p>@{channel.slug}</p>
				{#if channel.description}
					<p class="m-desc">{channel.description}</p>
				{/if}
				<p class="m-meta">{channel.track_count ?? tracks.length} tracks</p>
			</div>
		</section>

		<section class="m-tracks">
			<h3>Tracks</h3>
			{#if tracks.length}
				<ul>
					{#each tracks as track (track.id)}
						<li>
							<button type="button" onclick={() => playTrack(track)}>
								<span class="m-track-title">{track.title || track.url}</span>
								{#if track.created_at}
									<span class="m-track-date">{track.created_at.slice(0, 10)}</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{:else if isLoading}
				<p class="m-empty">Loading tracks…</p>
			{:else}
				<p class="m-empty">No tracks yet.</p>
			{/if}
		</section>
	{:else if isLoading}
		<p class="m-empty">Loading…</p>
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

	.m-bar h1 {
		margin: 0;
		justify-self: center;
		font-size: var(--font-5);
		font-weight: 650;
	}

	.m-icon-btn {
		width: 2.5rem;
		height: 2.5rem;
		min-width: 2.5rem;
		min-height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-12);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
	}

	.m-scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: var(--space-3);
		background: var(--color-interface);
	}

	.m-info {
		display: grid;
		grid-template-columns: 4.5rem 1fr;
		gap: var(--space-3);
		align-items: start;
		margin-bottom: var(--space-3);
	}

	.m-info-avatar {
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 999px;
		overflow: hidden;
		background: var(--gray-3);
	}

	.m-info-avatar :global(img),
	.m-info-avatar :global(.fallback) {
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
	}

	.m-info h2 {
		margin: 0;
		font-size: var(--font-6);
		font-weight: 700;
	}

	.m-info p {
		margin: var(--space-1) 0 0;
		color: var(--gray-10);
		font-size: var(--font-3);
	}

	.m-desc {
		color: var(--gray-11) !important;
		font-size: var(--font-4) !important;
		line-height: 1.45;
	}

	.m-meta {
		font-weight: 600;
	}

	.m-tracks h3 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-4);
		font-weight: 650;
	}

	.m-tracks ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--color-interface-border);
		border-radius: calc(var(--border-radius) * 2);
		overflow: hidden;
		background: var(--color-interface-elevated);
	}

	.m-tracks li + li {
		border-top: 1px solid var(--color-interface-border);
	}

	.m-tracks button {
		display: grid;
		gap: 0.15rem;
		width: 100%;
		min-height: 3.25rem;
		padding: var(--space-2) var(--space-3);
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.m-track-title {
		font-size: var(--font-4);
		font-weight: 550;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.m-track-date {
		color: var(--gray-10);
		font-size: var(--font-2);
	}

	.m-empty {
		margin: 0;
		color: var(--gray-10);
		font-size: var(--font-4);
	}
</style>
