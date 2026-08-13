<script>
	import {resolve} from '$app/paths'
	import {getContext} from 'svelte'
	import {playChannel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
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
	<a class="m-ctrl" href={resolve('/m/[slug]', {slug})} aria-label="Back">
		<Icon icon="arrow-left" />
	</a>
</header>

<main class="m-scroll">
	{#if tracks.length}
		<ul class="m-tracks">
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
	{:else if isLoading || !channel}
		<p class="m-empty">{channel ? 'Loading tracks…' : isLoading ? 'Loading…' : 'Channel not found.'}</p>
	{:else}
		<p class="m-empty">No tracks yet.</p>
	{/if}
</main>

<style>
	.m-bar {
		display: flex;
		align-items: center;
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-3);
		background: var(--color-interface);
		border-bottom: 1px solid var(--color-interface-border);
		flex-shrink: 0;
	}

	.m-ctrl {
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
		background: var(--color-interface);
	}

	.m-tracks {
		list-style: none;
		margin: 0;
		padding: 0;
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
		margin: var(--space-3);
		color: var(--gray-10);
		font-size: var(--font-4);
	}
</style>
