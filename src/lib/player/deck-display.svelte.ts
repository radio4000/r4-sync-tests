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
import {isListening, listeningChannelId} from '$lib/player/clock'
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
		const channelId = listeningChannelId(deck)
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
		const channelId = listeningChannelId(deck)
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
		isListening(deck) ? (broadcasterChannel ?? displayChannel) : displayChannel
	)
	const secondaryHeaderChannel = $derived.by(() => {
		if (!isListening(deck) || !headerChannel || !displayChannel) return undefined
		const same =
			(headerChannel.id && displayChannel.id && headerChannel.id === displayChannel.id) ||
			(headerChannel.slug && displayChannel.slug && headerChannel.slug === displayChannel.slug)
		return same ? undefined : displayChannel
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
		}
	}
}
