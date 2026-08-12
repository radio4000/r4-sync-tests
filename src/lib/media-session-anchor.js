import {logger} from '$lib/logger'

const log = logger.ns('media-session-anchor').seal()

// Chrome appears to bind Media Session action-handling authority (which drives
// lock-screen prev/next buttons) to whichever frame owns the *actual playing
// media element* — for a YouTube track that's YouTube's own nested,
// cross-origin iframe, which we can't reach into to register our own
// handlers. This is an experiment: give our own top-level frame a genuinely
// playing (silent) media element too, on the bet that Chrome will then treat
// *us* as an owning frame and respect our previoustrack/nexttrack handlers.
// ~0.05s of 8kHz mono silence, looped — any loop point is seamless since every
// sample is zero. Verified round-trip (Buffer -> base64 -> Buffer) while
// generating this, so it's a valid, playable WAV, not hand-typed.
const SILENT_WAV_DATA_URI =
	'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAA=='

/** @type {HTMLAudioElement | null} */
let audio = null

/** Deck IDs currently holding the anchor open. */
const activeDeckIds = new Set()

function ensureAudio() {
	if (audio) return audio
	audio = new Audio(SILENT_WAV_DATA_URI)
	audio.loop = true
	audio.volume = 1
	audio.muted = false
	// Never attached to the DOM — HTMLMediaElement plays fine detached, and
	// this keeps it out of any `document.querySelector('audio')` lookups
	// (notably `getMediaPlayer()` in api.ts, which only looks for
	// `audio.native-audio-player` scoped under a `[data-deck]` element, but
	// staying fully detached avoids any risk of collision entirely).
	return audio
}

/** Hold the silent top-frame anchor open while `deckId` is the one driving
 *  the OS media session. Ref-counted across decks, same shape as wake-lock.js.
 *  @param {number} deckId */
export function requestMediaSessionAnchor(deckId) {
	activeDeckIds.add(deckId)
	const el = ensureAudio()
	el.play().catch((error) => log.debug('play_failed', /** @type {Error} */ (error).message))
}

/** Stop holding the anchor open on behalf of `deckId`.
 *  @param {number} deckId */
export function releaseMediaSessionAnchor(deckId) {
	activeDeckIds.delete(deckId)
	if (!activeDeckIds.size && audio) audio.pause()
}
