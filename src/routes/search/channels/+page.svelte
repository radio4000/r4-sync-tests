<script>
	import {page} from '$app/state'
	import {resolve} from '$app/paths'
	import {SearchUrl} from '$lib/search-url.svelte.js'
	import {searchChannelsCombined} from '$lib/search'
	import {viewFromUrl} from '$lib/views'
	import {channelsCollection} from '$lib/collections/channels'
	import {getFeaturedSuggestions} from '$lib/featured-suggestions.svelte'
	import {getTopChannelSlugs, paginationFromUrl} from '$lib/utils'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import SearchShell from '$lib/components/search-shell.svelte'
	import Pagination from '$lib/components/pagination.svelte'
	import Seo from '$lib/components/seo.svelte'
	import {trap} from '$lib/focus'
	import {fromAction} from 'svelte/attachments'
	import * as m from '$lib/paraglide/messages'

	const uid = $props.id()
	const search = new SearchUrl('/search/channels')

	// URL is the single source of truth
	const view = $derived(viewFromUrl(page.url))
	const q = $derived(view.sources[0] ?? {})
	const hasFilter = $derived(!!q.channels?.length || !!q.search)
	const suggestions = getFeaturedSuggestions()
	const featuredChannelSlugs = $derived(getTopChannelSlugs(suggestions.pool, 6))

	const paginationState = $derived(paginationFromUrl(page.url))
	const currentPage = $derived(paginationState.page)
	const pageSize = $derived(paginationState.per)

	/** @type {import('$lib/types.ts').Channel[]} */
	let channels = $state([])
	let totalCount = $state(0)
	let channelsLoading = $state(false)
	const resultCount = $derived(totalCount || channels.length)

	$effect(() => {
		if (!hasFilter) {
			channels = []
			totalCount = 0
			return
		}
		channelsLoading = true
		let stale = false
		searchChannelsCombined({
			slugs: q.channels,
			query: q.search,
			localChannels: [...channelsCollection.state.values()],
			limit: pageSize,
			offset: (currentPage - 1) * pageSize
		})
			.then((result) => {
				if (!stale) {
					channels = result.channels
					totalCount = result.count
					channelsLoading = false
				}
			})
			.catch(() => {
				if (!stale) channelsLoading = false
			})
		return () => {
			stale = true
		}
	})
</script>

<Seo title={m.search_title()} plain />

<article {@attach fromAction(trap)}>
	<SearchShell {uid} bind:value={search.value} onsubmit={search.handleSubmit}>
		{#snippet pagination()}
			<Pagination {currentPage} {pageSize} {totalCount} defaultPageSize={50} />
		{/snippet}
	</SearchShell>

	{#if hasFilter}
		{#if channelsLoading}
			<p>{m.search_loading_channels()}</p>
		{:else if channels.length}
			<section class="channel-results">
				<header>
					<h2>
						{resultCount === 1
							? m.search_channel_one({count: resultCount})
							: m.search_channel_other({count: resultCount})}
					</h2>
				</header>
				<ul class="list">
					{#each channels as channel (channel.id)}
						<li><ChannelCard {channel} /></li>
					{/each}
				</ul>
			</section>
		{:else}
			<p>{m.search_no_results()} "{search.value}"</p>
		{/if}
	{:else}
		<div class="empty-tip">
			<p><small>{m.search_tip_slug()}</small></p>
			{#if featuredChannelSlugs.length}
				<p class="featured-tags">
					<small>{m.search_examples()}</small>
					{#each featuredChannelSlugs as slug (`channel-${slug}`)}
						<a href={resolve('/search/channels') + `?q=${encodeURIComponent('@' + slug)}`}
							>@{slug}</a
						>
					{/each}
				</p>
			{/if}
			<p class="browse-links">
				<a href={resolve('/channels/all')}>All {m.explore_tab_channels()}</a>
			</p>
		</div>
	{/if}
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	article > p {
		margin-inline: 0.5rem;
	}

	.channel-results > header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-inline: 0.5rem;
	}

	.channel-results {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.empty-tip {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin: 0;
	}

	.featured-tags,
	.browse-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) 0.5rem;
		justify-content: center;
		color: light-dark(var(--gray-9), var(--gray-8));

		a {
			color: var(--accent-9);
			text-decoration: none;
			&:hover {
				text-decoration: underline;
			}
		}
	}
</style>
