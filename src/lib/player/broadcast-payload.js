/**
 * Wire format for broadcasting non-DB (ephemeral) tracks to listeners.
 * Discogs matches and local-file imports use synthetic, non-UUID IDs;
 * listeners can't look those up by id, so the broadcaster ships
 * url/title/media_id alongside and the listener reconstructs a Track.
 */

import {parseUrl} from 'media-now/parse-url'
import {isDbId} from '$lib/utils'

/** @typedef {import('$lib/types').Track} Track */
/** @typedef {import('$lib/types').Deck} Deck */
/** @typedef {import('$lib/types').BroadcastDeckState} BroadcastDeckState */
/** @typedef {{track_url: string | null, track_title: string | null, track_media_id: string | null}} EphemeralPayload */

/** @type {EphemeralPayload} */
const EMPTY = {track_url: null, track_title: null, track_media_id: null}

/**
 * Playback fields mirrored between a local {@link Deck} and the wire
 * {@link BroadcastDeckState}. One declaration drives both directions so the
 * send and apply sides can't drift. `fallback` is what {@link packPlaybackFields}
 * emits when the deck value is nullish; `present` is the guard
 * {@link pickPlaybackFields} uses to skip missing/invalid wire values.
 * @type {ReadonlyArray<{key: keyof BroadcastDeckState, fallback: unknown, present: (v: unknown) => boolean}>}
 */
const PLAYBACK_FIELDS = [
	{key: 'track_played_at', fallback: null, present: (v) => Boolean(v)},
	{key: 'seeked_at', fallback: null, present: (v) => Boolean(v)},
	{key: 'seek_position', fallback: null, present: (v) => v != null},
	{key: 'is_playing', fallback: false, present: (v) => typeof v === 'boolean'},
	{key: 'volume', fallback: 0, present: (v) => typeof v === 'number'},
	{key: 'muted', fallback: false, present: (v) => typeof v === 'boolean'},
	{key: 'speed', fallback: 1, present: (v) => typeof v === 'number'}
]

/**
 * Snapshot a deck's playback fields for the wire, filling defaults for nullish
 * values so every wire field is present (the SDK type requires them).
 * @param {Partial<Deck> | null | undefined} deck
 * @returns {Partial<BroadcastDeckState>}
 */
export function packPlaybackFields(deck) {
	/** @type {Record<string, unknown>} */
	const out = {}
	const src = /** @type {Record<string, unknown>} */ (deck ?? {})
	for (const {key, fallback} of PLAYBACK_FIELDS) {
		out[key] = src[key] ?? fallback
	}
	return out
}

/**
 * Copy only valid playback fields off an untrusted wire state onto a deck patch.
 * Skips missing/wrong-typed fields rather than overwriting local state with junk.
 * @param {Partial<BroadcastDeckState> | null | undefined} state
 * @returns {Partial<Deck>}
 */
export function pickPlaybackFields(state) {
	/** @type {Record<string, unknown>} */
	const out = {}
	const src = /** @type {Record<string, unknown>} */ (state ?? {})
	for (const {key, present} of PLAYBACK_FIELDS) {
		if (present(src[key])) out[key] = src[key]
	}
	return out
}

/**
 * @param {Partial<Track> | null | undefined} track
 * @returns {EphemeralPayload}
 */
export function packEphemeralTrack(track) {
	if (!track?.id || isDbId(track.id)) return EMPTY
	return {
		track_url: track.url ?? null,
		track_title: track.title ?? null,
		track_media_id: track.media_id ?? null
	}
}

/**
 * @param {string | null | undefined} track_id
 * @param {Partial<EphemeralPayload> | null | undefined} payload
 * @returns {Track | undefined}
 */
export function unpackEphemeralTrack(track_id, payload) {
	if (!track_id || !payload?.track_url) return undefined
	const parsed = parseUrl(payload.track_url)
	const now = new Date().toISOString()
	return /** @type {Track} */ ({
		id: track_id,
		url: payload.track_url,
		title: payload.track_title ?? track_id,
		media_id: payload.track_media_id ?? parsed?.id ?? null,
		provider: parsed?.provider ?? null,
		created_at: now,
		updated_at: now,
		slug: null
	})
}
