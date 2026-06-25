/**
 * Clock — who drives a deck's playhead: manual / mirror / auto.
 *
 * `deck.clock` stores identity only (see {@link DeckClockState} in types.ts).
 * An absent clock means `manual` — you're driving the deck yourself. These are
 * the cheap identity reads used across the app — prefer them over poking
 * `deck.clock.kind` directly.
 */

import type {Deck} from '$lib/types'

export type ClockKind = 'manual' | 'mirror' | 'auto'

/** Which clock drives this deck. Absent `deck.clock` = manual playback. */
export function clockKind(deck?: Deck | null): ClockKind {
	return deck?.clock?.kind ?? 'manual'
}

/** True when this deck mirrors another channel's live broadcast. */
export function isMirroring(deck?: Deck | null): boolean {
	return deck?.clock?.kind === 'mirror'
}

/** The channel id this deck mirrors, or undefined when it isn't mirroring. */
export function mirroredChannelId(deck?: Deck | null): string | undefined {
	return deck?.clock?.kind === 'mirror' ? deck.clock.channel : undefined
}

/** True when the auto-radio formula drives this deck. */
export function isAutoRadio(deck?: Deck | null): boolean {
	return deck?.clock?.kind === 'auto'
}

/** The auto-radio rotation start (unix seconds), or undefined when not an auto deck. */
export function autoRotationStart(deck?: Deck | null): number | undefined {
	return deck?.clock?.kind === 'auto' ? deck.clock.rotationStart : undefined
}
