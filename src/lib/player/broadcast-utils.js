/**
 * Pure utilities for broadcast sync calculations.
 * No external deps — safe to import in tests.
 */

/** @typedef {import('$lib/types').BroadcastPlaybackFields} BroadcastPlaybackFields */
/** @typedef {import('$lib/types').Track} Track */

/** Shared drift tolerance used by both broadcast and auto-radio drift effects. */
export const DRIFT_TOLERANCE_SECONDS = 2

/** Defaults for a deck with no playback state yet, sent out as its BroadcastDeckState. */
export const BROADCAST_STATE_DEFAULTS = {
	track_played_at: null,
	seeked_at: null,
	seek_position: null,
	is_playing: false,
	volume: 0,
	muted: false,
	speed: 1
}

/**
 * Pick the shared playback fields off any broadcast-shaped source (a Deck,
 * a Broadcast row, or a BroadcastDeckState) — same field names on both ends,
 * so this works for mapping in either direction.
 * @param {BroadcastPlaybackFields | null | undefined} source
 * @returns {BroadcastPlaybackFields}
 */
export function pickBroadcastFields(source) {
	/** @type {BroadcastPlaybackFields} */
	const fields = {}
	if (!source) return fields
	if (source.track_played_at != null) fields.track_played_at = source.track_played_at
	if (source.seeked_at != null) fields.seeked_at = source.seeked_at
	if (source.seek_position != null) fields.seek_position = source.seek_position
	if (source.volume != null) fields.volume = source.volume
	if (source.muted != null) fields.muted = source.muted
	if (source.is_playing != null) fields.is_playing = source.is_playing
	if (source.speed != null) fields.speed = source.speed
	return fields
}

/**
 * Compose one deck's outbound BroadcastDeckState: index/track_id, the shared
 * playback field defaults, values picked off the deck, and the ephemeral
 * track payload (empty object when the track is already in the DB).
 * @param {number} index
 * @param {string | null} trackId
 * @param {BroadcastPlaybackFields | null | undefined} deck
 * @param {{track_url?: string | null, track_title?: string | null, track_media_id?: string | null}} ephemeralPayload
 */
export function composeBroadcastDeckState(index, trackId, deck, ephemeralPayload) {
	return {
		index,
		track_id: trackId,
		...BROADCAST_STATE_DEFAULTS,
		...pickBroadcastFields(deck),
		...ephemeralPayload
	}
}

/**
 * Calculate expected playback position for a broadcast listener.
 * Accounts for playback speed, seek position, and time elapsed.
 *
 * @param {BroadcastPlaybackFields} broadcast
 * @param {Partial<Track>} track
 * @returns {number|undefined}
 */
export function calculateSeekTime(broadcast, track) {
	const speed = broadcast.speed ?? 1
	if (broadcast.seek_position != null) {
		if (broadcast.seeked_at) {
			const elapsed = (Date.now() - new Date(broadcast.seeked_at).getTime()) / 1000
			if (elapsed < 0) return undefined
			const base = broadcast.is_playing
				? broadcast.seek_position + elapsed * speed
				: broadcast.seek_position
			if (track.duration && base >= track.duration) return undefined
			return Math.round(base)
		}
		return Math.round(broadcast.seek_position)
	}
	if (!broadcast.track_played_at) return undefined
	const elapsed = (Date.now() - new Date(broadcast.track_played_at).getTime()) / 1000
	if (elapsed < 0) return undefined
	if (track.duration && elapsed * speed >= track.duration) return undefined
	return Math.round(elapsed * speed)
}
