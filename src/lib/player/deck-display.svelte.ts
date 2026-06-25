/**
 * Reactive deck display state — what track and channel a deck is currently showing.
 * Centralises the `track ?? broadcastTrack ?? lastTrack` fallback chain, the
 * `channel ?? lastChannel` fallback, and the broadcast header rule. Used by
 * player.svelte and deck-compact-bar.svelte so both stay in sync.
 */

import {eq} from '@tanstack/svelte-db'
import {appState} from '$lib/app-state.svelte'
import {tracksCollection} from '$lib/collections/tracks'
import {channelsCollection} from '$lib/collections/channels'
import {broadcastsCollection} from '$lib/collections/broadcasts'
import {useLiveQuery} from '$lib/useLiveQuery.svelte'
import {unpackEphemeralTrack} from '$lib/player/broadcast-payload'
import {isMirroring, isAutoRadio, mirroredChannelId} from '$lib/player/clock'
import {viewLabel} from '$lib/views'
import {channelPresence} from '$lib/presence.svelte'
import type {Channel, Track, BroadcastDeckState} from '$lib/types'

export interface DeckDisplay {
	readonly track: Track | undefined
	readonly channel: Channel | undefined
	readonly broadcastTrack: Track | undefined
	readonly broadcasterChannel: Channel | undefined
	readonly lastTrack: Track | undefined
	readonly lastChannel: Channel | undefined
	readonly displayTrack: Track | undefined
	readonly displayChannel: Channel | undefined
	readonly headerChannel: Channel | undefined
	readonly secondaryHeaderChannel: Channel | undefined
	/** Slug of the channel this deck mirrors (mirror mode), else undefined. */
	readonly listenSlug: string | undefined
	/** Slug of the channel you're broadcasting, surfaced on your non-mirror decks, else undefined. */
	readonly broadcastSlug: string | undefined
	/** Live count for this deck's mode: mirror → auto → broadcast. 0 when none. */
	readonly presenceCount: number
}

export function createDeckDisplay(getDeckId: () => number): DeckDisplay {
	const deck = $derived(appState.decks[getDeckId()])

	const track = $derived.by(() => {
		const id = deck?.playlist_track
		if (!id) return undefined
		void tracksCollection.state.size
		return tracksCollection.state.get(id) as Track | undefined
	})

	const listeningBroadcastDeck = $derived.by<BroadcastDeckState | undefined>(() => {
		const channelId = mirroredChannelId(deck)
		if (!channelId) return undefined
		const trackId = deck?.playlist_track
		void broadcastsCollection.state.size
		const states = broadcastsCollection.state.get(channelId)?.decks
		if (!Array.isArray(states) || !states.length) return undefined
		return (trackId && states.find((s) => s?.track_id === trackId)) || states[0]
	})

	const broadcastTrack = $derived.by(() => {
		const state = listeningBroadcastDeck
		if (!state?.track_id) return undefined
		void tracksCollection.state.size
		const loaded = tracksCollection.state.get(state.track_id) as Track | undefined
		if (loaded) return loaded
		return unpackEphemeralTrack(state.track_id, state)
	})

	const channelQuery = useLiveQuery((q) =>
		q.from({ch: channelsCollection}).where(({ch}) => eq(ch.slug, deck?.playlist_slug ?? ''))
	)
	const channel = $derived(channelQuery.data?.[0] as Channel | undefined)

	const broadcasterChannel = $derived.by(() => {
		const channelId = mirroredChannelId(deck)
		if (!channelId) return undefined
		void channelsCollection.state.size
		return channelsCollection.state.get(channelId) as Channel | undefined
	})

	let lastTrack = $state<Track | undefined>(undefined)
	let lastChannel = $state<Channel | undefined>(undefined)
	const shouldReset = $derived(
		!deck || (!deck.playlist_track && (deck.playlist_tracks?.length ?? 0) === 0)
	)
	$effect.pre(() => {
		const current = track ?? broadcastTrack
		if (current) lastTrack = current
		else if (shouldReset) lastTrack = undefined
	})
	$effect.pre(() => {
		if (channel) lastChannel = channel
		else if (shouldReset) lastChannel = undefined
	})

	const displayTrack = $derived(track ?? broadcastTrack ?? lastTrack)
	const displayChannel = $derived(channel ?? lastChannel)

	const headerChannel = $derived(
		isMirroring(deck) ? (broadcasterChannel ?? displayChannel) : displayChannel
	)
	const secondaryHeaderChannel = $derived.by(() => {
		if (!isMirroring(deck) || !headerChannel || !displayChannel) return undefined
		const same =
			(headerChannel.id && displayChannel.id && headerChannel.id === displayChannel.id) ||
			(headerChannel.slug && displayChannel.slug && headerChannel.slug === displayChannel.slug)
		return same ? undefined : displayChannel
	})

	// Sync-mode slugs + live count. One source for player.svelte and deck-compact-bar.svelte.
	const listenSlug = $derived.by(() => {
		const id = mirroredChannelId(deck)
		if (!id) return undefined
		const ch = channelsCollection.state.get(id) as Channel | undefined
		const bc = broadcastsCollection.state.get(id) as {channels?: Channel} | undefined
		return ch?.slug ?? bc?.channels?.slug
	})
	const broadcastSlug = $derived.by(() => {
		const id = appState.broadcasting_channel_id
		if (!id || isMirroring(deck)) return undefined
		return (channelsCollection.state.get(id) as Channel | undefined)?.slug
	})
	const autoUri = $derived.by(() => {
		if (!isAutoRadio(deck) || !deck?.playlist_slug) return undefined
		return (
			viewLabel(deck.view ?? {sources: [{channels: [deck.playlist_slug]}]}) ||
			`@${deck.playlist_slug}`
		)
	})
	const presence = channelPresence as Record<
		string,
		{broadcast?: number; byUri?: Record<string, number>} | undefined
	>
	// Count follows the deck's own clock mode — a deck is only ever one.
	const presenceCount = $derived.by(() => {
		if (isMirroring(deck) && listenSlug) return presence[listenSlug]?.broadcast ?? 0
		const slug = deck?.playlist_slug
		if (autoUri && slug) return presence[slug]?.byUri?.[autoUri] ?? 0
		if (broadcastSlug) return presence[broadcastSlug]?.broadcast ?? 0
		return 0
	})

	return {
		get track() {
			return track
		},
		get channel() {
			return channel
		},
		get broadcastTrack() {
			return broadcastTrack
		},
		get broadcasterChannel() {
			return broadcasterChannel
		},
		get lastTrack() {
			return lastTrack
		},
		get lastChannel() {
			return lastChannel
		},
		get displayTrack() {
			return displayTrack
		},
		get displayChannel() {
			return displayChannel
		},
		get headerChannel() {
			return headerChannel
		},
		get secondaryHeaderChannel() {
			return secondaryHeaderChannel
		},
		get listenSlug() {
			return listenSlug
		},
		get broadcastSlug() {
			return broadcastSlug
		},
		get presenceCount() {
			return presenceCount
		}
	}
}
