<script lang="ts">
	import {page} from '$app/state'
	import {goto} from '$app/navigation'
	import {resolve} from '$app/paths'
	import {untrack} from 'svelte'
	import {setChannelCtx, setTracksQueryCtx, setChannelNavCtx} from '$lib/contexts'
	import type {Snippet} from 'svelte'
	import {eq, inArray} from '@tanstack/db'
	import {useLiveQuery} from '$lib/useLiveQuery.svelte'
	import {joinBroadcast, leaveBroadcast, startBroadcast, stopBroadcast} from '$lib/broadcast'
	import PresenceCount from '$lib/components/presence-count.svelte'
	import {appState, canEditChannel, isLocalChannel} from '$lib/app-state.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.svelte.js'
	import {tracksCollection, checkTracksFreshness, ensureTracksLoaded} from '$lib/collections/tracks'
	import {channelsCollection} from '$lib/collections/channels'
	import {broadcastsCollection} from '$lib/collections/broadcasts'
	import {
		getMediaPlayer,
		joinAutoRadio,
		playChannel,
		resyncAutoRadio,
		togglePlayPause
	} from '$lib/api'
	import {hasAutoRadioCoverage} from '$lib/player/auto-radio'
	import {findAutoDecksForChannel, findChannelPlayingDeck, findMirroringDeck} from '$lib/deck'
	import {isMirroring, isAutoRadio, mirroredChannelId} from '$lib/player/clock'
	import ButtonFollow from '$lib/components/button-follow.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import ChannelCanvasBg from '$lib/components/channel-canvas-bg.svelte'
	import DeckChannelHeader from '$lib/components/deck-channel-header.svelte'
	import Icon from '$lib/components/icon.svelte'
	import PopoverMenu from '$lib/components/popover-menu.svelte'
	import ChannelSectionMenu from '$lib/components/channel-section-menu.svelte'
	import * as m from '$lib/paraglide/messages'
	import {watchPresence, unwatchPresence, channelPresence} from '$lib/presence.svelte'
	import {pickRouteChannel, updateStableChannelId} from '$lib/channel-route'
	import type {Channel} from '$lib/types'

	// --- Props & route params ---

	let {children} = $props()
	let channelNavControls = $state<Snippet | undefined>(undefined)
	let channelStickyHeight = $state(0)
	setChannelNavCtx({
		setControls: (s) => {
			channelNavControls = s
		}
	})
	let slug = $derived(page.params.slug as string)
	let rssHref = $derived(resolve('/[slug].rss', {slug}))
	let tid = $derived(page.params.tid)
	let isTrackDetail = $derived(Boolean(tid))
	let authHref = $derived(`/auth?redirect=${encodeURIComponent(page.url.pathname)}`)

	// --- Channel resolution ---
	// Slug → ID on first hit, then query by stable ID.
	// This prevents "not found" flashes when the slug changes (edit, sync).

	const channelBySlugQuery = useLiveQuery((q) =>
		q
			.from({channels: channelsCollection})
			.where(({channels}) => eq(channels.slug, slug))
			.findOne()
	)
	let channelId = $state('')
	let channelIdSourceSlug = $state('')
	let channelFromSlug = $derived(
		/** @type {import('$lib/types').Channel | undefined} */ /** @type {unknown} */ channelBySlugQuery.data
	)
	$effect(() => {
		const next = updateStableChannelId(slug, channelId, channelIdSourceSlug, channelFromSlug)
		if (next.channelId !== channelId) channelId = next.channelId
		if (next.channelIdSourceSlug !== channelIdSourceSlug)
			channelIdSourceSlug = next.channelIdSourceSlug
	})

	const stableChannelId = $derived(channelIdSourceSlug === slug ? channelId : '')

	// Reactive query by stable ID — survives slug changes for the same route target
	const channelByIdQuery = useLiveQuery((q) =>
		stableChannelId
			? q
					.from({channels: channelsCollection})
					.where(({channels}) => inArray(channels.id, [stableChannelId]))
					.findOne()
			: null
	)
	let channelFromId = $derived(
		/** @type {import('$lib/types').Channel | undefined} */ /** @type {unknown} */ channelByIdQuery.data
	)
	let channel = $derived(pickRouteChannel(slug, channelFromSlug, channelFromId))
	let channelIsLoading = $derived(
		!channel && (channelBySlugQuery.isLoading || (Boolean(channelId) && channelByIdQuery.isLoading))
	)
	let channelIsReady = $derived(
		Boolean(channel) || (channelBySlugQuery.isReady && (!channelId || channelByIdQuery.isReady))
	)

	// --- Queries ---

	// Tracks query lives in layout — stays alive during [slug]/* navigation
	const tracksQuery = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, slug))
			.orderBy(({tracks}) => tracks.created_at, 'desc')
	)
	let allChannelTracks = $derived(tracksQuery.data ?? [])
	// Keep the last resolved channel during the brief gap while switching channels,
	// so the header doesn't flash "@unknown" / collapse. displayChannel === channel
	// in steady state; only during the ~60ms resolution gap does it fall back to the
	// previous channel until the new one resolves. Logic/effects still use `channel`.
	let lastChannel = $state<Channel | undefined>(undefined)
	$effect(() => {
		if (channel?.id) {
			const resolved = channel
			untrack(() => (lastChannel = resolved))
		}
	})
	// Fall back to the previous channel only while the new one is still loading.
	// Once resolved-as-missing (channelIsReady && !channel) we drop it so the
	// "not found" state shows instead of a stale header.
	let displayChannel = $derived(channel ?? (channelIsReady ? undefined : lastChannel))
	// Tab count: prefer loaded tracks, fall back to the channel's known count while
	// they load — avoids a "Tracks (0)" flash on every channel switch.
	let channelTrackCount = $derived(allChannelTracks.length || displayChannel?.track_count || 0)

	// Channel-specific broadcast live query so "Live" state updates on this page
	const channelBroadcastQuery = useLiveQuery((q) =>
		channelId
			? q
					.from({b: broadcastsCollection})
					.where(({b}) => eq(b.channel_id, channelId))
					.findOne()
			: q
					.from({b: broadcastsCollection})
					.orderBy(({b}) => b.channel_id, 'asc')
					.limit(0)
	)

	// --- Deriveds ---

	let isChannelLive = $derived(Boolean(channelBroadcastQuery.data))
	let isMirroringChannel = $derived(
		Boolean(
			channel?.id && Object.values(appState.decks).some((d) => mirroredChannelId(d) === channel.id)
		)
	)
	let canEdit = $derived(canEditChannel(channel?.id))
	let anyChannelAutoDecks = $derived(findAutoDecksForChannel(appState.decks, channel?.slug))
	let channelPlayingDeck = $derived(
		findChannelPlayingDeck(appState.decks, appState.active_deck_id, channel?.slug)
	)
	let channelListeningDeck = $derived(
		findMirroringDeck(appState.decks, appState.active_deck_id, channel?.id)
	)
	let activeDeck = $derived(appState.decks[appState.active_deck_id])
	let isChannelLoaded = $derived(
		Boolean(channel?.slug && activeDeck?.playlist_slug === channel.slug)
	)
	let isChannelPlaying = $derived(Boolean(isChannelLoaded && activeDeck?.is_playing))
	let isAutoEnabled = $derived(
		Boolean(isAutoRadio(activeDeck) && activeDeck?.playlist_slug === slug)
	)
	let canShowAutoButton = $derived(hasAutoRadioCoverage(allChannelTracks))
	let activeAutoDrifted = $derived(Boolean(isAutoEnabled && activeDeck?.drifted))
	let autoPresenceCount = $derived(
		channel?.slug ? (channelPresence[channel.slug]?.byUri?.[`@${channel.slug}`] ?? 0) : 0
	)
	let livePresenceCount = $derived(
		channel?.slug ? (channelPresence[channel.slug]?.broadcast ?? 0) : 0
	)
	let playLoading = $state(false)
	let liveLoading = $state(false)
	let userChannelSlug = $derived(appState.channel?.slug ?? '')
	let playTooltip = $derived(isChannelPlaying ? m.player_tooltip_pause() : m.player_tooltip_play())
	let playLabel = $derived(
		playTooltip
			.replace(/\s*<kbd>[^<]*<\/kbd>/gi, '')
			.replace(/<[^>]+>/g, '')
			.trim()
	)
	let listeningTrack = $derived.by(() => {
		const trackId = channelListeningDeck?.playlist_track
		if (!trackId) return undefined
		void tracksCollection.state.size
		return tracksCollection.state.get(trackId)
	})

	// --- Effects ---

	// Redirect when the channel's slug drifts from the URL (e.g. after editing)
	$effect(() => {
		if (channel?.slug && channel.slug !== slug) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local URL parsing for navigation, not reactive state
			const url = new URL(page.url)
			url.pathname = page.url.pathname.replace(`/${slug}`, resolve('/[slug]', {slug: channel.slug}))
			goto(`${url.pathname}${url.search}${url.hash}`, {replaceState: true})
		}
	})

	// Watch presence for this channel (observe counts without tracking self)
	$effect(() => {
		const s = channel?.slug
		if (!s) return
		untrack(() => watchPresence(s))
		return () => unwatchPresence(s)
	})

	// Check freshness in background (cached for 60s)
	$effect(() => {
		if (slug) {
			checkTracksFreshness(slug)
		}
	})

	$effect(() => {
		if (userChannelSlug) {
			void ensureTracksLoaded(userChannelSlug)
		}
	})

	async function onLiveAction() {
		if (!channel || liveLoading) return
		liveLoading = true
		try {
			if (canEdit) {
				if (isChannelLive) {
					await stopBroadcast(channel.id)
					appState.broadcasting_channel_id = undefined
					return
				}

				const deckId = appState.active_deck_id
				const deck = appState.decks[deckId]
				if (!deck?.playlist_track || deck.playlist_slug !== channel.slug) {
					await playChannel(deckId, {id: channel.id, slug: channel.slug}, tid)
				}
				const player = getMediaPlayer(deckId)
				if (player?.paused) player.play()
				const trackId = appState.decks[deckId]?.playlist_track
				if (!trackId) return
				await startBroadcast(channel.id, trackId)
				appState.broadcasting_channel_id = channel.id
				return
			}

			if (isMirroringChannel) {
				leaveBroadcast(appState.active_deck_id)
				return
			}
			if (isChannelLive) {
				await joinBroadcast(channel.id)
				return
			}
		} finally {
			liveLoading = false
		}
	}

	async function onPlayAction() {
		if (!channel || playLoading) return
		if (isChannelLoaded) {
			togglePlayPause(appState.active_deck_id)
			return
		}
		playLoading = true
		try {
			await playChannel(appState.active_deck_id, channel, tid)
		} finally {
			playLoading = false
		}
	}

	async function onAutoAction() {
		if (!channel) return
		const deckId = appState.active_deck_id
		const deck = appState.decks[deckId]
		if (isMirroring(deck)) {
			leaveBroadcast(deckId)
		}
		if (isAutoRadio(deck) && deck.playlist_slug === slug) {
			void resyncAutoRadio(deckId)
			return
		}
		await ensureTracksLoaded(slug)
		const tracks = [...tracksCollection.state.values()].filter((t) => t.slug === slug)
		await joinAutoRadio(deckId, tracks, {sources: [{channels: [slug]}]})
	}

	// --- Context providers ---

	setChannelCtx({
		get data() {
			return channel
		},
		get isReady() {
			return channelIsReady
		},
		get isLoading() {
			return channelIsLoading
		}
	})
	setTracksQueryCtx(tracksQuery)
</script>

<svelte:head>
	{#if channel}
		<link rel="alternate" type="application/rss+xml" title={channel.name} href={rssHref} />
	{/if}
</svelte:head>

<div class="channel-layout fill-height" style="--channel-sticky-height: {channelStickyHeight}px">
	<div class="channel-sticky" bind:clientHeight={channelStickyHeight}>
		{#if displayChannel}
			<header>
				<ChannelCanvasBg id={displayChannel.image} />
				<div class="channel-main">
					<div class="avatar">
						{#if isChannelLive}
							<button
								type="button"
								class="avatar-btn"
								title={m.channel_card_join_broadcast()}
								onclick={() => joinBroadcast(displayChannel.id)}
							>
								<ChannelAvatar id={displayChannel.image} alt={displayChannel.name} size={80} />
							</button>
						{:else}
							<a href={resolve('/[slug]/image', {slug})} tabindex="-1">
								<ChannelAvatar id={displayChannel.image} alt={displayChannel.name} size={80} />
							</a>
						{/if}
					</div>
					<div class="info">
						<DeckChannelHeader
							deck={channelListeningDeck ?? channelPlayingDeck ?? anyChannelAutoDecks[0]}
							channel={displayChannel}
							track={listeningTrack}
							titleElement="h1"
							titleClass="channel-page-title"
							titleHref={resolve('/[slug]', {slug})}
							showModeMeta={false}
						/>
					</div>
				</div>

				<div class="channel-secondary-actions">
					{#if (appState.channels?.length ?? 0) > 0}
						<ButtonFollow channel={displayChannel} />
					{:else}
						<a href={authHref} class="btn" {@attach tooltip({content: m.common_follow()})}>
							<Icon icon="favorite" />
						</a>
					{/if}
					<PopoverMenu triggerAttachment={tooltip({content: m.common_more()})}>
						{#snippet trigger()}<Icon icon="options-vertical" />{/snippet}
						<menu class="nav-vertical">
							{#if canEdit}
								<a
									href={resolve('/[slug]/edit', {slug})}
									class:active={page.route.id?.startsWith('/[slug]/edit')}
								>
									<Icon icon="edit" />
									{m.common_edit()}
								</a>
								<a
									href={resolve('/[slug]/batch-edit', {slug})}
									class:active={page.route.id?.startsWith('/[slug]/batch-edit')}
								>
									<Icon icon="unordered-list" />
									{m.batch_edit_nav_label()}
								</a>
								<a
									href={resolve('/[slug]/backup', {slug})}
									class:active={page.route.id?.startsWith('/[slug]/backup')}
								>
									<Icon icon="document-download" />
									Backup
								</a>
								<hr />
							{:else if isLocalChannel(channel?.id)}
								<a
									href={resolve('/[slug]/delete', {slug})}
									class:active={page.route.id?.startsWith('/[slug]/delete')}
								>
									<Icon icon="delete" />
									{m.channel_delete_heading()}
								</a>
								<hr />
							{/if}
							<button
								type="button"
								onclick={() => (appState.modal_share = {channel: displayChannel})}
							>
								<Icon icon="share" />
								{m.share_native()}
							</button>
						</menu>
					</PopoverMenu>
				</div>

				<div class="channel-controls">
					<menu class="channel-actions" role="group" aria-label="Channel actions">
						{#if canEdit || isChannelLive || isMirroringChannel}
							<button
								type="button"
								class={[
									'mode-action',
									'live',
									{active: canEdit ? isChannelLive : isMirroringChannel}
								]}
								onclick={onLiveAction}
								disabled={liveLoading}
								{@attach tooltip({
									content: canEdit
										? isChannelLive
											? m.broadcast_stop_button()
											: m.broadcast_start_button()
										: isMirroringChannel
											? m.broadcasts_leave()
											: m.broadcasts_join()
								})}
							>
								<Icon icon="signal" size={14} />
								<span>
									{#if canEdit}
										{isChannelLive ? m.broadcast_stop_button() : m.broadcast_start_button()}
									{:else if isMirroringChannel}
										{m.status_live_short()}
									{:else}
										{m.broadcasts_join()}
									{/if}
								</span>
								{#if livePresenceCount > 0}
									<PresenceCount count={livePresenceCount} />
								{/if}
							</button>
						{/if}

						{#if canShowAutoButton}
							<button
								type="button"
								class={['mode-action', 'auto', {active: isAutoEnabled, drifted: activeAutoDrifted}]}
								onclick={onAutoAction}
								{@attach tooltip({
									content: activeAutoDrifted ? m.auto_radio_resync() : m.auto_radio_join()
								})}
							>
								<Icon icon="infinite" size={14} />
								<span>Auto</span>
								{#if autoPresenceCount > 0}
									<PresenceCount count={autoPresenceCount} />
								{/if}
							</button>
						{/if}

						<button
							type="button"
							class={['mode-action', 'play', {active: isChannelPlaying}]}
							onclick={onPlayAction}
							disabled={playLoading}
							{@attach tooltip({content: playTooltip})}
						>
							<Icon icon={isChannelPlaying ? 'pause' : 'play-fill'} size={14} />
							<span>{playLabel}</span>
						</button>
					</menu>
				</div>
			</header>
		{/if}

		{#if !isTrackDetail}
			<menu class="channel-nav">
				{#if page.route.id !== '/[slug]/image'}
					<ChannelSectionMenu {slug} channel={displayChannel} trackCount={channelTrackCount} />
				{/if}
				{#if channelNavControls}
					<menu class="channel-nav-controls">
						{@render channelNavControls()}
					</menu>
				{/if}
			</menu>
		{/if}
	</div>

	<main>
		{#if channelIsReady && !channel}
			<p style="padding: 1rem;">{m.channel_not_found()}</p>
		{:else}
			{@render children()}
		{/if}
	</main>
</div>

<style>
	.channel-layout {
		display: flex;
		flex-direction: column;
	}

	.channel-sticky {
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--gray-1);
		container-type: inline-size;
	}

	header {
		position: relative;
		display: grid;
		grid-template-areas:
			'main secondary'
			'controls controls';
		grid-template-columns: 1fr auto;
		gap: var(--space-1);
		padding: var(--space-2);
		min-width: 0;
		align-items: center;
		background: var(--gray-2);
		border-bottom: 1px solid var(--gray-3);
		overflow: hidden;
	}

	header > :not(.channel-canvas-bg) {
		position: relative;
		z-index: 1;
	}

	@container (min-width: 500px) {
		header {
			grid-template-areas: 'main controls secondary';
			grid-template-columns: auto 1fr auto;
		}
	}

	.channel-main {
		grid-area: main;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.avatar {
		width: 3rem;
		flex-shrink: 0;
	}

	.avatar-btn {
		display: block;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		width: 100%;
	}

	.info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
		flex: 1 1 auto;

		:global(.deck-channel-header) {
			flex: 1;
			min-width: 0;
		}
	}

	.info :global(.channel-page-title) {
		font-size: var(--font-6);
		line-height: 1.1;
		margin: 0;
		transition: color 0.15s;
	}

	.info :global(.channel-page-title.active) {
		color: var(--accent-9);
	}

	.info :global(.meta-row) {
		font-size: var(--font-3);
	}

	.channel-controls {
		grid-area: controls;
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
	}

	.channel-actions {
		display: flex;
		align-items: stretch;
		justify-content: center;
		gap: var(--space-1);
		flex: 1 1 auto;
		min-width: 0;
		margin: 0;
	}

	.channel-secondary-actions {
		grid-area: secondary;
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	main {
		background: var(--gray-1);
		position: relative;
		z-index: 15;
		flex: 1;
		min-height: 0;
		height: 100%;
	}

	.channel-nav {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		background: var(--gray-1);
		padding: 0.5rem;
	}

	.channel-nav-controls {
		display: flex;
		min-width: 0;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-1);
	}
</style>
