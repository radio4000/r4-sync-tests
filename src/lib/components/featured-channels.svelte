<script>
	import {appState} from '$lib/app-state.svelte'
	import {playChannel, togglePlayPause} from '$lib/api'
	import {pickFeatured, dailySeed} from '$lib/collections/featured'
	import {shuffleSeed} from '$lib/utils'
	import ChannelCard from './channel-card.svelte'
	import Icon from './icon.svelte'
	import * as m from '$lib/paraglide/messages'

	/** @type {{pool: import('$lib/types').Channel[], pickCount: number, titleHref?: string, skeleton?: boolean, column?: boolean}} */
	let {pool, pickCount, titleHref, skeleton = false, column = false} = $props()

	// Daily-seeded by default (same rotation as /featured); reshuffle picks a
	// random seed for instant variety. Shared pickFeatured keeps both in sync.
	let seed = $state(dailySeed())
	let shuffling = $state(false)

	const channels = $derived(pickFeatured(pool, {count: pickCount, seed}))
	const first = $derived(channels[0] ?? null)
	const isPlaying = $derived(
		!!first &&
			Object.values(appState.decks).some((d) => d.playlist_slug === first.slug && d.is_playing)
	)

	function togglePlay() {
		if (!first) return
		if (isPlaying) togglePlayPause(appState.active_deck_id)
		else playChannel(appState.active_deck_id, first)
	}

	function reshuffle() {
		if (!pool.length || shuffling) return
		shuffling = true
		try {
			seed = shuffleSeed()
		} finally {
			shuffling = false
		}
	}
</script>

{#if channels.length}
	<section class="section" class:section--featured-col={column}>
		<header class="section-header">
			<h2 class="section-title">
				{#if titleHref}
					<a class="btn chip" href={titleHref}>{m.home_featured()}</a>
				{:else}
					{m.home_featured()}
				{/if}
			</h2>
			<menu>
				{#if first}
					<button type="button" onclick={togglePlay}>
						<Icon icon={isPlaying ? 'pause' : 'play-fill'} />
					</button>
				{/if}
				{#if pool.length > pickCount}
					<button
						type="button"
						title={m.home_featured_refresh()}
						onclick={reshuffle}
						disabled={shuffling}
					>
						<Icon icon="switch-alt" />
					</button>
				{/if}
			</menu>
		</header>
		<ol class="grid grid--scroll">
			{#each channels as channel (channel.id)}
				<li><ChannelCard {channel} /></li>
			{/each}
		</ol>
	</section>
{:else if skeleton}
	<!-- Skeleton mirrors ChannelCard's height-driving structure (square figure +
	     body) so the featured slot reserves its space before data loads, instead
	     of popping in and shoving the globe down (CLS). -->
	<section class="section" class:section--featured-col={column} aria-hidden="true">
		<header class="section-header">
			<h2 class="section-title">
				{#if titleHref}
					<a class="btn chip" href={titleHref}>{m.home_featured()}</a>
				{:else}
					{m.home_featured()}
				{/if}
			</h2>
		</header>
		<ol class="grid grid--scroll">
			{#each Array.from({length: pickCount}) as _, i (i)}
				<li>
					<article class="card skeleton-card">
						<div class="sk-figure"></div>
						<div class="sk-body">
							<div class="sk-line sk-title"></div>
							<div class="sk-line sk-slug"></div>
							<div class="sk-line sk-desc"></div>
							<div class="sk-line sk-desc"></div>
							<div class="sk-line sk-desc sk-desc--short"></div>
							<div class="sk-line sk-meta"></div>
						</div>
					</article>
				</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	.section--featured-col {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;

		@media (max-width: 600px) {
			:global(.card .description) {
				display: none;
			}
		}
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;

		.section-title {
			margin-bottom: 0;
		}
	}

	.section-title {
		font-size: var(--font-7);
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: light-dark(var(--gray-11), var(--gray-9));
	}

	/* Featured loading skeleton — mirrors ChannelCard's structure so the slot height
	   matches the real cards and nothing shifts when they load. */
	.skeleton-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-1);
		height: 100%;
	}

	.sk-figure {
		aspect-ratio: 1;
		width: 100%;
		border-radius: var(--border-radius);
		background: var(--gray-2);
	}

	.sk-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
		flex: 1;
	}

	.sk-line {
		background: var(--gray-2);
		border-radius: 4px;
	}

	.sk-title {
		height: 1rem;
		width: 70%;
	}

	.sk-slug {
		height: 0.5rem;
		width: 40%;
	}

	.sk-desc {
		height: 0.5rem;
		width: 92%;
		margin-top: 0.5rem;
	}

	.sk-desc--short {
		width: 60%;
		margin-top: 0;
	}

	.sk-meta {
		height: 0.5rem;
		width: 30%;
		margin-top: auto;
	}

	@media (prefers-reduced-motion: no-preference) {
		.skeleton-card .sk-figure,
		.skeleton-card .sk-line {
			animation: sk-pulse 1.4s ease-in-out infinite;
		}
	}

	@keyframes sk-pulse {
		50% {
			opacity: 0.55;
		}
	}
</style>
