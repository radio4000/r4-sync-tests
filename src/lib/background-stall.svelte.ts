// Tracks whether playback has stalled specifically while the page was hidden
// (locked screen / backgrounded app) this session — the signal
// battery-optimization-hint.svelte gates on. Deliberately session-only, not
// persisted: a fresh load starts clean and re-detects if the problem recurs,
// rather than carrying a stale flag forward forever.
export const backgroundStall = $state({detected: false})

export function reportBackgroundStall() {
	backgroundStall.detected = true
}
