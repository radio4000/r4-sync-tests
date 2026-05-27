/**
 * Wire format for broadcasting non-DB (ephemeral) tracks to listeners.
 * Discogs matches and local-file imports use synthetic, non-UUID IDs;
 * listeners can't look those up by id, so the broadcaster ships
 * url/title/media_id alongside and the listener reconstructs a Track.
 */

import {parseUrl} from 'media-now/parse-url'
import {isDbId} from '$lib/utils'

/** @typedef {import('$lib/types').Track} Track */
/** @typedef {import('$lib/types').BroadcastDeckState} BroadcastDeckState */
/** @typedef {{track_url: string | null, track_title: string | null, track_media_id: string | null}} EphemeralPayload */

/** @type {EphemeralPayload} */
const EMPTY = {track_url: null, track_title: null, track_media_id: null}

/**
 * @param {Partial<Track> | null | undefined} track
 * @returns {EphemeralPayload}
 */
export function packEphemeralTrack(track) {
	if (!track || !track.id || isDbId(track.id)) return EMPTY
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
