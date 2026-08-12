<script>
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

	const channels = $derived(pickFeatured(pool, {count: pickCount, seed}))

	function reshuffle() {
		if (pool.length) seed = shuffleSeed()
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
				{#if pool.length > pickCount}
					<button type="button" title={m.home_featured_refresh()} onclick={reshuffle}>
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

		@media (max-width: 640px) {
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
