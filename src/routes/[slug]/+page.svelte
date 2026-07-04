<script lang="ts">
	import {page} from '$app/state'
	import {resolve} from '$app/paths'
	import {goto} from '$app/navigation'
	import {getChannelCtx, getTracksQueryCtx} from '$lib/contexts'
	import ChannelNavControlsPortal from '$lib/components/channel-nav-controls-portal.svelte'
	import PopoverMenu from '$lib/components/popover-menu.svelte'
	import {appState, canEditChannel} from '$lib/app-state.svelte'
	import {tracksCollection} from '$lib/collections/tracks'
	import {eq} from '@tanstack/db'
	import {useLiveQuery} from '$lib/useLiveQuery.svelte'
	import {getChannelConnections, getFollowedChannels} from '$lib/followed-channels.svelte'
	import {computeChannelMatchScore} from '$lib/channel-match-score'
	import Tracklist from '$lib/components/tracklist.svelte'
	import AutoRadioButton from '$lib/components/auto-radio-button.svelte'
	import LinkEntities from '$lib/components/link-entities.svelte'
	import Icon from '$lib/components/icon.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import {relativeDate} from '$lib/dates'
	import {extractHashtags, channelAvatarUrl} from '$lib/utils'
	import {addToPlaylist, joinAutoRadio, playTrack, setPlaylist, togglePlayPause} from '$lib/api'
	import {toAutoTracks, hasAutoRadioCoverage} from '$lib/player/auto-radio'
	import {getAutoDecksForView} from '$lib/views.svelte'
	import * as m from '$lib/paraglide/messages'
	import Seo from '$lib/components/seo.svelte'

	const SECTION_TRACK_LIMIT = 50
	const FEATURED_LIMIT = 10

	const channelCtx = getChannelCtx()
	const tracksQuery = getTracksQueryCtx()

	let slug = $derived(page.params.slug as string)
	let channel = $derived(channelCtx.data)
	let allTracks = $derived(tracksQuery.data || [])
	let previewTracks = $derived(allTracks.slice(0, SECTION_TRACK_LIMIT))
	let canEdit = $derived(canEditChannel(channel?.id))

	// Featured tags parsed from description
	let featuredTags = $derived(
		extractHashtags(channel?.description ?? '')
			.map((t) => t.slice(1))
			.slice(0, FEATURED_LIMIT) // strip #
	)

	// Per-tag sections — store full matching list, slice only for display
	let tagSections = $derived(
		featuredTags.map((tag) => {
			const tracks = allTracks.filter((t) => t.tags?.includes(tag))
			return {tag, tracks}
		})
	)

	// Only featured tags that actually have tracks
	let availableTagSections = $derived(tagSections.filter((s) => s.tracks.length > 0))

	// Tags active in any deck's playlist
	const deckPlaylistTags = $derived([
		...new Set(
			Object.values(appState.decks).flatMap(
				(d) =>
					d.playlist_title
						?.split(' ')
						.filter((t) => t.startsWith('#'))
						.map((t) => t.slice(1)) ?? []
			)
		)
	])

	// Per-tag sections for deck tags NOT already in featuredTags (avoids duplicate tabs)
	let deckOnlyTagSections = $derived(
		deckPlaylistTags
			.filter((tag) => !featuredTags.includes(tag))
			.map((tag) => ({tag, tracks: allTracks.filter((t) => t.tags?.includes(tag))}))
			.filter((s) => s.tracks.length > 0)
	)

	let searchInput = $state('')
	$effect(() => {
		const q = searchInput.trim()
		if (!q) return
		goto(`/${slug}/tracks?q=${encodeURIComponent(q)}`, {state: {focus: true}})
	})

	// Tag multi-selection — empty means "Latest"
	let selectedTags = $state<string[]>([])

	// Drop any selected tags that are no longer available
	$effect(() => {
		const validTags = new Set([...availableTagSections, ...deckOnlyTagSections].map((s) => s.tag))
		const filtered = selectedTags.filter((t) => validTags.has(t))
		if (filtered.length !== selectedTags.length) selectedTags = filtered
	})

	function toggleTag(tag: string) {
		selectedTags = selectedTags.includes(tag)
			? selectedTags.filter((t) => t !== tag)
			: [...selectedTags, tag]
	}

	// Tracks for the current selection
	let tagFilteredTracks = $derived(
		selectedTags.length === 0
			? allTracks
			: allTracks.filter((t) => selectedTags.every((tag) => t.tags?.includes(tag)))
	)
	let displayTracks = $derived(
		selectedTags.length === 0 ? previewTracks : tagFilteredTracks.slice(0, SECTION_TRACK_LIMIT)
	)
	let selectedPlaylistTitle = $derived(
		selectedTags.length > 0 ? selectedTags.map((t) => `#${t}`).join(' ') : undefined
	)
	const follows = getFollowedChannels()
	// Follow-graph ids only — the channel objects shown come from the user's
	// already-loaded followed channels.
	const followerConn = getChannelConnections('followers', () => channel?.id, {hydrate: false})
	const followingConn = getChannelConnections('following', () => channel?.id, {hydrate: false})
	// Own channel's followers — for the "follows you" badge
	const ownFollowers = getChannelConnections('followers', () => appState.channel?.id, {
		hydrate: false
	})

	function compactOverlapText(items: import('$lib/types').Channel[]) {
		if (items.length === 0) return ''
		const names = items.slice(0, 2).map((c) => `@${c.slug}`)
		const rest = Math.max(0, items.length - names.length)
		return rest > 0 ? `${names.join(', ')} and ${rest} others` : names.join(', ')
	}

	function formatCoordinate(value: number, positive: string, negative: string) {
		const abs = Math.abs(value)
		const rounded = Number(abs.toFixed(4))
		const compact = String(rounded)
		return `${compact}${value >= 0 ? positive : negative}`
	}

	let followerIdSet = $derived(new Set(followerConn.ids))
	let followingIdSet = $derived(new Set(followingConn.ids))
	let commonFollowers = $derived(follows.followedChannels.filter((c) => followerIdSet.has(c.id)))
	let commonFollowing = $derived(follows.followedChannels.filter((c) => followingIdSet.has(c.id)))
	let previewCommonFollowers = $derived(commonFollowers.slice(0, 4))
	let previewCommonFollowing = $derived(commonFollowing.slice(0, 4))

	// "Follows you" — the viewed channel appears in your own channel followers.
	let followsYou = $derived(Boolean(channel?.id && ownFollowers.ids.includes(channel.id)))

	// Match score — computed from user's own tracks vs this channel's tracks
	let userChannelSlug = $derived(appState.channel?.slug ?? '')
	const userTracksQuery = useLiveQuery(
		(q) =>
			userChannelSlug
				? q
						.from({tracks: tracksCollection})
						.where(({tracks}) => eq(tracks.slug, userChannelSlug))
						.orderBy(({tracks}) => tracks.created_at, 'desc')
				: null,
		[() => userChannelSlug]
	)
	let userChannelTracks = $derived(userTracksQuery.data ?? [])
	let matchScore = $derived(computeChannelMatchScore(userChannelTracks, allTracks))
	let showMatchScore = $derived(
		Boolean(
			appState.user &&
			channel &&
			appState.channel &&
			!canEdit &&
			userChannelTracks.length > 0 &&
			allTracks.length > 0
		)
	)
	let hasMatchInfo = $derived(
		showMatchScore &&
			(matchScore.url.overlap > 0 ||
				matchScore.tag.overlap > 0 ||
				matchScore.artistTitle.overlap > 0)
	)
	let matchingSourceSlug = $derived(appState.channel?.slug ?? '')
	let hasCoordinates = $derived(
		Number.isFinite(Number(channel?.latitude)) && Number.isFinite(Number(channel?.longitude))
	)
	let coordinatesLabel = $derived.by(() => {
		if (!hasCoordinates) return ''
		const lat = Number(channel?.latitude)
		const lng = Number(channel?.longitude)
		return `${formatCoordinate(lat, 'N', 'S')} ${formatCoordinate(lng, 'E', 'W')}`
	})

	const activeDeck = $derived(appState.decks[appState.active_deck_id])

	async function playTracks(tracks: {id: string}[], title?: string) {
		const ids = tracks.map((t) => t.id)
		await playTrack(appState.active_deck_id, ids[0], null, 'play_search')
		setPlaylist(appState.active_deck_id, ids, title ? {title} : undefined)
	}

	function queueTracks(tracks: {id: string}[]) {
		addToPlaylist(
			appState.active_deck_id,
			tracks.map((t) => t.id)
		)
	}
</script>

<Seo
	title={channel?.name || m.channel_page_fallback()}
	description={channel?.description}
	image={channel?.image ? channelAvatarUrl(channel.image) : undefined}
	url={page.url.href}
	type="music.radio_station"
/>

<ChannelNavControlsPortal controls={navControls} />

{#snippet navControls()}
	{#if deckOnlyTagSections.length > 0 || availableTagSections.length > 0}
		<PopoverMenu closeOnClick={false}>
			{#snippet trigger()}
				<Icon icon="hash" />{selectedTags.length > 0 ? `(${selectedTags.length})` : ''}
			{/snippet}
			<menu class="nav-vertical tags-menu">
				<button
					type="button"
					class:active={selectedTags.length === 0}
					onclick={() => (selectedTags = [])}
				>
					{m.channel_section_latest()}
					<span class="tag-count">({Math.min(allTracks.length, SECTION_TRACK_LIMIT)})</span>
				</button>
				{#each deckOnlyTagSections as { tag, tracks } (tag)}
					<button
						type="button"
						data-deck-active
						class:active={selectedTags.includes(tag)}
						onclick={() => toggleTag(tag)}
					>
						#{tag} <span class="tag-count">({tracks.length})</span>
					</button>
				{/each}
				{#each availableTagSections as { tag, tracks } (tag)}
					<button
						type="button"
						data-deck-active={deckPlaylistTags.includes(tag) || undefined}
						class:active={selectedTags.includes(tag)}
						onclick={() => toggleTag(tag)}
					>
						#{tag} <span class="tag-count">({tracks.length})</span>
					</button>
				{/each}
			</menu>
		</PopoverMenu>
	{/if}
	<SearchInput
		bind:value={searchInput}
		placeholder={m.channel_tracks_search_placeholder()}
		debounce={300}
	/>
	{#if selectedTags.length > 0 && tracksQuery.isReady && displayTracks.length > 0}
		{@const autoView = slug ? {sources: [{channels: [slug], tags: selectedTags}]} : undefined}
		{@const autoDecks = getAutoDecksForView(Object.values(appState.decks), autoView)}
		{@const isAutoActive = autoDecks.length > 0}
		{@const isAutoPlaying = autoDecks.some((d) => d.is_playing)}
		{@const isAutoDrifted = autoDecks.some((d) => d.auto_radio_drifted)}
		<div class="play-actions-group">
			<button
				type="button"
				onclick={() =>
					activeDeck?.is_playing
						? togglePlayPause(appState.active_deck_id)
						: playTracks(tagFilteredTracks, selectedPlaylistTitle)}
				title={activeDeck?.is_playing ? m.common_pause() : m.channel_play_latest()}
			>
				<Icon icon={activeDeck?.is_playing ? 'pause' : 'play-fill'} />
			</button>
			<button
				type="button"
				onclick={() => queueTracks(tagFilteredTracks)}
				title={m.search_queue_all()}
			>
				<Icon icon="next-fill" />
			</button>
			{#if hasAutoRadioCoverage(tagFilteredTracks)}
				<AutoRadioButton
					live={isAutoActive && isAutoPlaying}
					drifted={isAutoDrifted}
					title={isAutoDrifted ? m.auto_radio_resync() : m.auto_radio_join()}
					onclick={() =>
						autoView &&
						joinAutoRadio(appState.active_deck_id, toAutoTracks(tagFilteredTracks), autoView)}
				/>
			{/if}
		</div>
	{/if}
{/snippet}

{#if channel}
	<article>
		<div class="channel-meta">
			{#if channel.url}
				<div class="meta-row">
					<p class="url"><a href={channel.url} target="_blank" rel="noopener">{channel.url}</a></p>
				</div>
			{/if}
			<div class="meta-row">
				{#if channel.description}
					<p class="description"><LinkEntities slug={channel.slug} text={channel.description} /></p>
				{/if}
				<p class="dates">
					{#if hasCoordinates}
						<a href={resolve('/[slug]/map', {slug})} class="coords-link">{coordinatesLabel}</a>
					{/if}
					<small
						>{m.channel_updated({
							date: relativeDate(channel.latest_track_at ?? channel.updated_at)
						})}</small
					>
				</p>
			</div>
		</div>

		{#if appState.user && !canEdit}
			{@const hasAnyOverlap =
				followsYou ||
				previewCommonFollowers.length > 0 ||
				previewCommonFollowing.length > 0 ||
				hasMatchInfo}
			{#if hasAnyOverlap}
				<section class="common-follows compact">
					{#if followsYou}
						<div class="compact-row follows-you-row">
							<Icon icon="favorite-fill" size={14} />
							<p>{m.channel_follows_you()}</p>
						</div>
					{/if}
					{#if hasMatchInfo}
						<div class="compact-row match-score-row">
							<span><Icon icon="flower-alt" size={14} /> {matchScore.total}% match</span>
							<a
								href={resolve('/[slug]/tracks', {slug}) +
									`?matching=${encodeURIComponent(matchingSourceSlug)}`}
							>
								<Icon icon="play-fill" size={14} />
								{matchScore.url.overlap}
								{m.channel_match_tracks()}
							</a>
							<a
								href={resolve('/[slug]/tags', {slug}) +
									`?matching=${encodeURIComponent(matchingSourceSlug)}`}
							>
								<Icon icon="hashtag" size={14} />
								{matchScore.tag.overlap}
								{m.channel_match_tags()}
							</a>
						</div>
					{/if}
					{#if previewCommonFollowers.length > 0}
						<a href={resolve('/[slug]/followers/in-common', {slug})} class="compact-row">
							<div class="compact-avatars">
								{#each previewCommonFollowers as c (c.id)}
									<ChannelAvatar id={c.image} alt={c.name} size={24} />
								{/each}
							</div>
							<p>{m.channel_match_followed_by({names: compactOverlapText(commonFollowers)})}</p>
						</a>
					{/if}
					{#if previewCommonFollowing.length > 0}
						<a href={resolve('/[slug]/following/in-common', {slug})} class="compact-row">
							<div class="compact-avatars">
								{#each previewCommonFollowing as c (c.id)}
									<ChannelAvatar id={c.image} alt={c.name} size={24} />
								{/each}
							</div>
							<p>{m.channel_match_also_follows({names: compactOverlapText(commonFollowing)})}</p>
						</a>
					{/if}
				</section>
			{/if}
		{/if}

		<section class="track-section">
			{#if tracksQuery.isReady && displayTracks.length > 0}
				<Tracklist
					tracks={displayTracks}
					playlistTracks={tagFilteredTracks}
					playlistTitle={selectedPlaylistTitle}
					{canEdit}
					grouped={false}
					virtual={false}
					playContext={true}
				/>
				<footer>
					{#if selectedTags.length === 0}
						<a href={resolve('/[slug]/tracks', {slug})} class="btn"
							>{m.channel_see_all_tracks({count: allTracks.length})}</a
						>
					{:else if selectedTags.length === 1}
						<a href={resolve('/[slug]/tracks', {slug}) + '?tags=' + selectedTags[0]} class="btn"
							>{m.channel_see_all_tag({count: tagFilteredTracks.length, tag: selectedTags[0]})}</a
						>
					{:else}
						<a
							href={resolve('/[slug]/tracks', {slug}) + '?tags=' + selectedTags.join(',')}
							class="btn">{m.channel_see_all_tracks({count: tagFilteredTracks.length})}</a
						>
					{/if}
				</footer>
			{:else if tracksQuery.isLoading && (channel.track_count ?? 0) > 0}
				<p class="empty">{m.channel_loading_tracks()}</p>
			{:else if tracksQuery.isReady && allTracks.length === 0}
				<p class="empty">{m.channel_no_tracks()}</p>
			{/if}
		</section>
	</article>
{/if}

<style>
	article {
		display: flex;
		flex-direction: column;
	}

	.channel-meta {
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.dates {
		color: var(--gray-10);
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.coords-link {
		color: inherit;
		font-size: var(--font-2);
		letter-spacing: 0.01em;
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 0.08em;
	}

	.description {
		white-space: pre-line;
		overflow-wrap: break-word;
		font-stretch: 90%;
		font-style: italic;
		color: light-dark(var(--gray-11), var(--gray-9));
	}

	.url {
		font-style: italic;
		color: var(--gray-9);
	}

	.url a {
		color: inherit;
	}

	article:has(.track-section) {
		display: flex;
		flex-flow: column;
		height: 100%;
	}

	.track-section {
		display: flex;
		flex-flow: column;
		height: 100%;
		footer {
			margin: auto 0 0;
			padding: 0.5rem;
			text-align: center;
			position: sticky;
			bottom: 0;
			background: var(--gray-1);
			background: linear-gradient(0deg, #0000000f, transparent);
			border: 0;
			pointer-events: none;
			a {
				pointer-events: auto;
			}
		}
	}

	.common-follows {
		padding: 0.5rem;
		display: grid;
		gap: var(--space-2);
	}

	.common-follows.compact {
		font-size: var(--font-2);
	}

	.match-score-row {
		gap: clamp(var(--space-1), 1.4vw, var(--space-2));
		row-gap: var(--space-1);
		padding-bottom: var(--space-1);
		flex-wrap: wrap;
		align-items: center;
		color: var(--gray-10);
		font-size: clamp(0.72rem, 2.8vw, var(--font-2));
	}

	.match-score-row span,
	.match-score-row a {
		display: inline-flex;
		align-items: center;
		gap: clamp(0.16rem, 0.9vw, 0.28rem);
		white-space: nowrap;
		line-height: 1.2;
	}

	.match-score-row a {
		color: inherit;
		text-decoration: underline;
		text-decoration-style: dotted;
	}

	.follows-you-row {
		color: var(--accent-9);
		gap: var(--space-1);
	}

	.follows-you-row p {
		color: var(--accent-9) !important;
	}

	.compact-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 1.8rem;
		color: inherit;
		text-decoration: none;
	}

	.compact-row p {
		margin: 0;
		color: var(--gray-11);
		line-height: 1.25;
	}

	.compact-avatars {
		display: inline-flex;
		align-items: center;
		margin-right: var(--space-1);
	}

	.compact-avatars :global(img),
	.compact-avatars :global(svg) {
		width: 1.2rem;
		height: 1.2rem;
		border-radius: 999px;
		border: 1px solid var(--gray-1);
		margin-right: calc(-1 * var(--space-1));
		background: var(--gray-2);
	}

	.empty {
		padding: 1rem;
	}

	.tag-count {
		opacity: 0.6;
		font-size: 0.85em;
	}

	.play-actions-group {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		margin-inline: auto;
	}
</style>
