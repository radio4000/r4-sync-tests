<script>
	import {goto} from '$app/navigation'
	import {resolve} from '$app/paths'
	import {appState} from '$lib/app-state.svelte'
	import {appName} from '$lib/config'
	import {broadcastsCollection} from '$lib/collections/broadcasts'
	import {channelsCollection, fetchAppStats} from '$lib/collections/channels'
	import {useLiveQuery} from '$lib/useLiveQuery.svelte'
	import {getFollowedChannels} from '$lib/followed-channels.svelte'
	import {getFeaturedPool} from '$lib/collections/featured'
	import {tracksCollection, ensureTracksLoaded} from '$lib/collections/tracks'
	import {getChannelTags, extractHashtags} from '$lib/utils'
	import {loadDeckView, playTrack, sortByNewest} from '$lib/api'
	import {isBroadcasting} from '$lib/deck'
	import {authStatus} from '$lib/app-state.svelte'
	import {appPresence} from '$lib/presence.svelte'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import FeaturedChannels from '$lib/components/featured-channels.svelte'
	import HomeGlobe from '$lib/components/home-globe.svelte'
	import {not, isNull, eq} from '@tanstack/db'
	import Icon from '$lib/components/icon.svelte'
	import PageHeader from '$lib/components/page-header.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import Seo from '$lib/components/seo.svelte'
	import * as m from '$lib/paraglide/messages'

	const FEATURED_COUNT = 3
	const FEATURED_COUNT_LOGGEDOUT = 20
	const FEATURED_DAYS = 30

	const isSignedIn = $derived(!!appState.user)
	const userChannel = $derived(appState.channel)
	let homeSearch = $state('')

	$effect(() => {
		const q = homeSearch.trim()
		if (!q) return
		goto(`/search?q=${encodeURIComponent(q)}`, {state: {focus: true}})
	})

	const follows = getFollowedChannels()
	const favoriteChannelIds = $derived(new Set(follows.followedIds))

	// Todo checklist: show when channel exists but onboarding is incomplete
	const showOnboarding = $derived(
		!follows.isLoading &&
			!!userChannel &&
			((userChannel.track_count ?? 0) === 0 ||
				follows.followedIds.length === 0 ||
				!userChannel.image)
	)

	// Featured channels (not logged in, or no channel)
	let featuredPool = $state(/** @type {import('$lib/types').Channel[]} */ ([]))
	let featuredLoaded = $state(false)

	const featuredPickCount = $derived(!isSignedIn ? FEATURED_COUNT_LOGGEDOUT : FEATURED_COUNT)

	$effect(() => {
		if (featuredLoaded) return
		featuredLoaded = true
		void (async () => {
			try {
				featuredPool = await getFeaturedPool(FEATURED_DAYS)
			} catch (e) {
				console.warn('[homepage] failed to load featured channels', e)
			}
		})()
	})

	// Live broadcasts — reactive via useLiveQuery, sorted by most recently active
	const broadcastsQuery = useLiveQuery(broadcastsCollection)
	const broadcastRows = $derived(
		(broadcastsQuery.data ?? []).toSorted((a, b) =>
			(b.track_played_at ?? '').localeCompare(a.track_played_at ?? '')
		)
	)
	const activeBroadcasts = $derived(broadcastRows.slice(0, 10))
	const favoriteBroadcastRows = $derived.by(() =>
		broadcastRows.filter((broadcast) => favoriteChannelIds.has(broadcast.channel_id))
	)
	const broadcastCount = $derived(broadcastRows.length)
	const favoriteBroadcastCount = $derived(favoriteBroadcastRows.length)
	const userChannelIsBroadcasting = $derived(isBroadcasting(appState.decks, userChannel?.id))

	const userChannelTrackCount = $derived(userChannel?.track_count ?? 0)
	const showTrackWidget = $derived(userChannelTrackCount > 0)

	// Reactive: subscribes to the collection so tags appear once ensureTracksLoaded
	// writes them. A plain tracksCollection.state read wouldn't re-run on that write.
	const channelTracksQuery = useLiveQuery((q) =>
		userChannel?.slug
			? q.from({t: tracksCollection}).where(({t}) => eq(t.slug, userChannel.slug))
			: null
	)

	const userChannelTopTags = $derived.by(() => {
		if (!userChannel?.slug) return []
		const channelTracks = /** @type {import('$lib/types').Track[]} */ (
			channelTracksQuery.data ?? []
		)
		const featuredTags = extractHashtags(userChannel.description ?? '').map((t) => t.slice(1))
		const allByCount = getChannelTags(channelTracks)
		const featuredWithCount = featuredTags
			.map((tag) => allByCount.find((t) => t.value === tag) ?? {value: tag, count: 0})
			.slice(0, 13)
		const topExtra = allByCount
			.filter((t) => !featuredTags.includes(t.value))
			.slice(0, 13 - featuredWithCount.length)
		return [...featuredWithCount, ...topExtra]
	})

	const tagsLoading = $derived(showTrackWidget && userChannelTopTags.length === 0)

	$effect(() => {
		const slug = userChannel?.slug
		if (!slug || !showTrackWidget) return
		void ensureTracksLoaded(slug)
	})

	async function playChannelTag(tag) {
		if (!userChannel) return
		const slug = userChannel.slug
		await ensureTracksLoaded(slug)
		const tracks = /** @type {import('$lib/types').Track[]} */ (
			[...tracksCollection.state.values()]
				.filter(
					(t) =>
						/** @type {any} */ (t).slug === slug && /** @type {any} */ (t.tags ?? []).includes(tag)
				)
				.sort(sortByNewest)
		)
		if (!tracks.length) return
		loadDeckView(
			appState.active_deck_id,
			{sources: [{channels: [slug], tags: [tag]}]},
			tracks.map((t) => t.id),
			{slug}
		)
		await playTrack(appState.active_deck_id, tracks[0].id, null, 'play_channel')
	}

	const showFavoritesWidget = $derived(follows.followedChannels.length > 0)
	const showFavoriteBroadcastWidget = $derived(favoriteBroadcastCount > 0)
	const showBroadcastCountWidget = $derived(broadcastCount > 0 && !userChannelIsBroadcasting)

	let homeMapVisible = $state(false)

	// Globe channels — all synced channels with coordinates
	const globeChannelsQuery = useLiveQuery((q) =>
		homeMapVisible
			? q.from({ch: channelsCollection}).where(({ch}) => not(isNull(ch.latitude)))
			: null
	)
	const globeChannels = $derived(
		(globeChannelsQuery.data ?? []).filter((ch) => (ch.track_count ?? 0) > 10)
	)
	const favoriteMapChannels = $derived(follows.followedChannels.filter((ch) => ch.latitude != null))
	const mapChannels = $derived(
		isSignedIn && favoriteMapChannels.length > 0 ? favoriteMapChannels : globeChannels
	)
	const mapOverlayHref = $derived(
		isSignedIn && favoriteMapChannels.length > 0
			? resolve('/channels/favorites') + '?display=map'
			: resolve('/channels/all') + '?display=map'
	)

	// Stats for not-logged-in users
	let channelCount = $state(0)
	let trackCount = $state(0)
	$effect(() => {
		if (isSignedIn) return
		fetchAppStats().then((stats) => {
			channelCount = stats.channels
			trackCount = stats.tracks
		})
	})
</script>

<Seo title={m.home_title({appName})} plain />

<div class="homepage" class:signed-in={isSignedIn}>
	<PageHeader>
		<SearchInput
			bind:value={homeSearch}
			debounce={300}
			placeholder={m.header_search_placeholder()}
		/>
		{#if isSignedIn && authStatus.channelChecked && !userChannel}
			<a href={resolve('/create-channel')} class="btn primary create-channel-action">
				<Icon icon="add" />{m.home_create_channel()}
			</a>
		{/if}
		{#if !isSignedIn}
			{#if !appState.show_welcome_hint}
				<button
					class="btn"
					style="margin-left: auto"
					onclick={() => (appState.show_welcome_hint = true)}
					title={m.welcome_title({appName})}
				>
					<Icon icon="circle-info" />
				</button>
			{/if}
		{/if}
	</PageHeader>

	{#if isSignedIn && userChannel}
		<!-- Logged in with channel -->

		<section class="section dashboard-section">
			{#if showTrackWidget || showFavoritesWidget || showFavoriteBroadcastWidget}
				<div class="dashboard-group">
					<div class="dashboard-grid dashboard-grid--scroll">
						{#if showTrackWidget}
							<a
								class="dashboard-card dashboard-card--link dashboard-card--row dashboard-card--pill"
								href={resolve('/[slug]/tracks', {slug: userChannel.slug})}
							>
								<Icon icon="unordered-list" size={16} />
								<span class="chip-label">
									{m.home_dashboard_tracks()}
									<strong class="chip-count">{userChannelTrackCount.toLocaleString()}</strong>
								</span>
							</a>
						{/if}
						{#if showFavoritesWidget}
							<a
								class="dashboard-card dashboard-card--link dashboard-card--row dashboard-card--pill"
								href={resolve('/[slug]/following', {slug: userChannel.slug})}
							>
								<Icon icon="favorite-fill" size={16} />
								<span class="chip-label">
									{m.home_dashboard_favorites()}
									<strong class="chip-count"
										>{follows.followedChannels.length.toLocaleString()}</strong
									>
								</span>
							</a>
						{/if}
						{#if showFavoriteBroadcastWidget}
							<a
								class="dashboard-card dashboard-card--link dashboard-card--row dashboard-card--pill"
								href={resolve('/channels/broadcasting')}
							>
								<Icon icon="signal" size={16} />
								<span class="chip-label">
									{m.home_dashboard_favorites_broadcasting()}
									<strong class="chip-count">{favoriteBroadcastCount.toLocaleString()}</strong>
								</span>
							</a>
						{/if}
					</div>
				</div>
			{/if}

			{#if userChannelTopTags.length > 0 || tagsLoading}
				<div class="dashboard-group">
					<div class="dashboard-grid dashboard-grid--scroll">
						{#if tagsLoading}
							<div
								class="dashboard-card dashboard-card--row dashboard-card--pill loading-placeholder"
							>
								<small>…</small>
							</div>
						{/if}
						{#each userChannelTopTags as { value, count } (value)}
							<div class="dashboard-card dashboard-card--row dashboard-card--pill">
								<button
									class="btn ghost tag-pill-action"
									onclick={() => playChannelTag(value)}
									title="Play #{value}"
								>
									<Icon icon="play-fill" />
								</button>
								<a
									class="dashboard-label--tag"
									href={resolve('/[slug]/tracks', {slug: userChannel.slug}) +
										`?tags=${encodeURIComponent(value)}`}
									>#{value} <span class="chip-count">{count}</span></a
								>
								<a
									class="btn ghost tag-pill-action"
									href={resolve('/search/tracks') + `?q=${encodeURIComponent('#' + value)}`}
									title="Search #{value} globally"
								>
									<Icon icon="search" />
								</a>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if showOnboarding}
				{#if appState.show_onboarding_hint}
					<section class="section onboarding-section dismissible">
						<button
							class="dismiss-btn"
							onclick={() => (appState.show_onboarding_hint = false)}
							aria-label="Close"
						>
							<Icon icon="close" />
						</button>
						<ol class="todo-list">
							<li>
								<input type="checkbox" disabled checked={(userChannel.track_count ?? 0) > 0} />
								<a href={resolve('/[slug]/tracks', {slug: userChannel.slug})}
									>{m.home_onboarding_add_track()}</a
								>
							</li>
							<li>
								<input type="checkbox" disabled checked={follows.followedIds.length > 0} />
								<a href={resolve('/channels/featured')}>{m.home_onboarding_follow_radio()}</a>
							</li>
							<li>
								<input type="checkbox" disabled checked={!!userChannel.image} />
								<a href={resolve('/[slug]/edit', {slug: userChannel.slug})}
									>{m.home_onboarding_add_image()}</a
								>
							</li>
						</ol>
					</section>
				{:else}
					<div class="onboarding-toggle-row">
						<button
							class="btn onboarding-toggle"
							onclick={() => (appState.show_onboarding_hint = true)}
							title="Show getting started"
						>
							<Icon icon="circle-info" />
						</button>
					</div>
				{/if}
			{/if}
		</section>

		<section class="section section--globe">
			<HomeGlobe
				channels={mapChannels}
				zoom={1}
				overlayHref={mapOverlayHref}
				onvisible={() => (homeMapVisible = true)}
			/>
		</section>
	{:else if isSignedIn && authStatus.channelChecked}
		<!-- Logged in but no channel -->
		<section class="section dashboard-section">
			<div class="dashboard-grid">
				<a
					class="dashboard-card dashboard-card--link dashboard-card--row"
					href={resolve('/create-channel')}
				>
					<Icon icon="add" size={16} />
					<span>{m.home_create_channel()}</span>
				</a>
			</div>
		</section>
		{#if activeBroadcasts.length}
			<section class="section">
				<h2 class="section-title">
					<a class="btn chip" href={resolve('/channels/broadcasting')}>{m.home_broadcasting()}</a>
				</h2>
				<ol class="list">
					{#each activeBroadcasts as broadcast (broadcast.channel_id)}
						<li><ChannelCard channel={broadcast.channels} /></li>
					{/each}
				</ol>
			</section>
		{/if}

		<FeaturedChannels pool={featuredPool} pickCount={featuredPickCount} />
	{:else}
		<!-- Not logged in -->

		{#if appState.show_welcome_hint || showBroadcastCountWidget}
			<div class="loggedout-top-row" class:modal-open={appState.show_welcome_hint}>
				{#if appState.show_welcome_hint}
					<section class="section welcome-section dismissible top-row-welcome">
						<button
							class="dismiss-btn"
							onclick={() => (appState.show_welcome_hint = false)}
							aria-label="Close"
						>
							<Icon icon="close" />
						</button>
						<h1>{m.welcome_title({appName})}</h1>
						<p class="tagline">{m.welcome_tagline_channel()}</p>
						<p class="tagline">{m.welcome_tagline_metadata()}</p>
						<ul class="feature-list">
							<li>{m.welcome_feature_archive()}</li>
							<li>{m.welcome_feature_decks()}</li>
							<li>{m.welcome_feature_follow()}</li>
							<li>{m.welcome_feature_open()}</li>
						</ul>
						<menu class="welcome-menu">
							<a
								href={resolve('/auth/create-account') + '?redirect=' + resolve('/create-channel')}
								class="btn primary">{m.header_start_your_radio()}</a
							>
							<a href={resolve('/auth/login')} class="btn">{m.nav_sign_in()}</a>
							<a href={resolve('/about')} class="btn ghost">{m.nav_about()}</a>
						</menu>
					</section>
				{/if}

				{#if showBroadcastCountWidget}
					<section class="section top-row-live">
						<h2 class="section-title">
							<a class="btn chip" href={resolve('/channels/broadcasting')}
								>{m.home_broadcasting()}</a
							>
						</h2>
						<ol class="list">
							{#each activeBroadcasts as broadcast (broadcast.channel_id)}
								<li><ChannelCard channel={broadcast.channels} /></li>
							{/each}
						</ol>
					</section>
				{/if}
			</div>
		{/if}

		<div class="loggedout-over-globe">
			<div class="loggedout-grid">
				<FeaturedChannels
					pool={featuredPool}
					pickCount={featuredPickCount}
					titleHref={resolve('/channels/featured')}
					skeleton
					column
				/>
			</div>

			{#if featuredLoaded && (channelCount || trackCount || appPresence.count)}
				<footer class="stats footer-stats">
					{#if channelCount}<a href={resolve('/channels/all')}
							>{m.home_stats_channels({count: channelCount.toLocaleString()})}</a
						>{/if}
					{#if trackCount}<a href={resolve('/tracks/recent')}
							>{m.home_stats_tracks({count: trackCount.toLocaleString()})}</a
						>{/if}
					{#if appPresence.count}<span>{m.home_stats_listeners({count: appPresence.count})}</span
						>{/if}
				</footer>
			{/if}
		</div>

		<section class="section section--globe section--globe--loggedout">
			<HomeGlobe
				channels={globeChannels}
				zoom={1.5}
				overlayHref={resolve('/channels/all') + '?display=map'}
				compact
				onvisible={() => (homeMapVisible = true)}
			/>
		</section>
	{/if}
</div>

<style>
	.homepage {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;

		/* grids manage their own horizontal spacing */
		:global(.grid) {
			margin-inline: 0rem;
		}
	}

	.homepage.signed-in {
		background: var(--color-interface);
	}

	.homepage:not(.signed-in) {
		padding: 0;
	}

	.create-channel-action {
		margin-left: auto;
	}

	.section {
		margin-bottom: 0;
	}

	/* :global() on .section — it's also rendered by FeaturedChannels, which doesn't share this scope */
	.homepage > :global(.section):not(.section--globe) {
		position: relative;
		z-index: 6;
		background: var(--color-interface);
	}

	.homepage.signed-in > :global(.section):not(.section--globe):not(.dashboard-section) {
		position: relative;
		z-index: 6;
		background: var(--color-interface);
	}

	.section--globe {
		display: flex;
		flex-direction: column;
		min-height: 0;
		margin-bottom: 0;
		position: relative;
		z-index: 0;
	}

	.homepage.signed-in .section--globe:not(.section--globe--loggedout) {
		flex: 1;
		min-height: 40dvh;
	}

	.homepage:not(.signed-in) .section--globe--loggedout {
		position: relative;
		z-index: 0;
	}

	.homepage:not(.signed-in) .loggedout-over-globe,
	.homepage:not(.signed-in) .loggedout-top-row,
	.homepage:not(.signed-in) .welcome-section {
		position: relative;
		z-index: 5;
	}

	.loggedout-top-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2);
		padding: var(--space-2) 0.5rem 0;
	}

	@media (min-width: 1024px) {
		.loggedout-top-row.modal-open {
			grid-template-columns: minmax(24rem, 1.2fr) minmax(20rem, 1fr);
			align-items: start;
		}

		.loggedout-top-row.modal-open .top-row-live {
			order: 0;
		}

		.loggedout-top-row.modal-open .top-row-welcome {
			order: 1;
		}
	}

	.loggedout-over-globe {
		position: relative;
		z-index: 6;
		background: var(--color-interface);
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		padding: 0 0.5rem 0.5rem;
		gap: 0.5rem;
	}

	.loggedout-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
		flex: 1;
		min-height: 0;
		overflow: hidden;

		/* :global() — the section here comes from FeaturedChannels, not this scope */
		& > :global(section) {
			min-width: 0;
			overflow: hidden;
		}
	}

	.dashboard-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: var(--space-2);

		:global(.list) {
			margin: 0;
		}
	}

	.dashboard-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		border-radius: var(--border-radius);
		background: var(--color-interface);
	}

	.dashboard-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.dashboard-grid--scroll {
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
		scroll-snap-type: x proximity;

		& > .dashboard-card {
			flex-shrink: 0;
			scroll-snap-align: start;
		}
	}

	.dashboard-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: 0.5rem;
		border-radius: var(--border-radius);
		background: light-dark(var(--gray-1), var(--gray-2));
		min-width: 0;
		min-height: 2rem;
	}

	.dashboard-card--row {
		flex-direction: row;
		align-items: center;
		overflow: hidden;
	}

	/* Same chrome as .btn.chip elsewhere (channel tabs, filters) — a pill is a pill. */
	.dashboard-card--pill {
		padding: 0 var(--space-2);
		border-radius: 1rem;
		gap: var(--space-1);
		min-height: 1.75rem;
		background: var(--button-bg);
		border: 1px solid var(--color-control-border);

		&:hover {
			background: var(--gray-4);
			border-color: var(--color-control-border-hover);
		}
	}

	.dashboard-card--link {
		text-decoration: none;
		transition: background var(--duration-1);

		&:hover,
		&:focus-visible {
			background: var(--gray-4);
			outline: none;
		}
	}

	.dashboard-card--row > a.dashboard-label--tag {
		flex: 0 0 auto;
		max-width: 16ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dashboard-label--tag {
		text-decoration: none;
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-1);
		min-width: 0;
		flex-shrink: 1;
		&:hover {
			text-decoration: underline;
		}
	}

	.dashboard-card:has(.dashboard-label--tag:hover) {
		background: var(--gray-3);
	}

	.tag-pill-action {
		flex: 0 0 auto;
	}

	.section-title {
		font-size: var(--font-7);
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: light-dark(var(--gray-11), var(--gray-9));
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
		margin: 0.5rem auto;
		max-width: 56rem;
		font-size: var(--font-3);
		color: light-dark(var(--gray-10), var(--gray-8));

		a {
			color: inherit;
			text-decoration: none;
			&:hover {
				text-decoration: underline;
			}
		}
	}

	.homepage:not(.signed-in) .stats {
		max-width: none;
		margin-inline: 0;
		padding-inline: 0.5rem;
	}

	.dismissible {
		position: relative;
	}

	.dismiss-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
	}

	.welcome-section {
		max-width: 56rem;
		margin-inline: auto;
		padding: 1.5rem;
		border-radius: var(--border-radius);
		background: var(--accent-2);
		margin-bottom: var(--space-3);

		h1 {
			font-size: var(--font-8);
			margin-bottom: 1rem;
		}

		.tagline {
			font-size: var(--font-6);
		}

		.feature-list {
			margin-block: 1rem;
			font-size: var(--font-5);
			padding-left: 1.25rem;

			li {
				margin-block: var(--space-1);
			}
		}
	}

	.welcome-menu {
		margin-block: 1rem 0;
		gap: 0.5rem;
		justify-content: center;
	}

	.onboarding-toggle-row {
		display: flex;
		justify-content: flex-end;
	}

	.onboarding-section {
		max-width: 56rem;
		margin-inline: auto;
		padding: 1.25rem;
		border-radius: 0.75rem;
		background: light-dark(var(--gray-2), var(--gray-2));
	}

	.onboarding-section {
		.todo-list {
			list-style: none;
			padding: 0;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			font-size: var(--font-5);

			li {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				color: light-dark(var(--gray-11), var(--gray-9));

				&:has(input:checked) {
					color: light-dark(var(--gray-8), var(--gray-7));
					text-decoration: line-through;

					a {
						color: inherit;
					}
				}
			}
		}
	}
</style>
