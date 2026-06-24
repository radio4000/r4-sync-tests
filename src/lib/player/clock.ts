/**
 * Axis-1 clock — who drives a deck's playhead: self / listener / auto.
 *
 * `deck.clock` stores identity only (see {@link DeckClockState} in types.ts);
 * `self` is the absence of a clock. These are the cheap identity reads used
 * across the app — prefer them over poking `deck.clock.kind` directly.
 *
 * The MediaPlayer-style derived adapter (`getClock(deck) -> {position, drifted,
 * resync()}`) is intentionally not here yet: while `drifted` is still computed
 * in player.svelte and stored on `deck.drifted`, the adapter would have no
 * callers. It lands when drift moves from stored to computed.
 */

import type {Deck} from '$lib/types'

export type ClockKind = 'self' | 'listener' | 'auto'

/** Which kind of clock drives this deck. Absent `deck.clock` = self (manual). */
export function clockKind(deck?: Deck | null): ClockKind {
	return deck?.clock?.kind ?? 'self'
}

/** True when a peer's broadcast drives this deck. */
export function isListening(deck?: Deck | null): boolean {
	return deck?.clock?.kind === 'listener'
}

/** The channel id this deck listens to, or undefined when it isn't a listener. */
export function listeningChannelId(deck?: Deck | null): string | undefined {
	return deck?.clock?.kind === 'listener' ? deck.clock.channel : undefined
}

/** True when the auto-radio formula drives this deck. */
export function isAutoRadio(deck?: Deck | null): boolean {
	return deck?.clock?.kind === 'auto'
}

/** The auto-radio rotation start (unix seconds), or undefined when not an auto deck. */
export function autoRotationStart(deck?: Deck | null): number | undefined {
	return deck?.clock?.kind === 'auto' ? deck.clock.rotationStart : undefined
}
