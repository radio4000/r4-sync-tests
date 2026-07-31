# Capture events

Plays, track ends, and skips are recorded as generic capture events, feeding the local history UI and optional analytics (PostHog).

## Data structure

```ts
interface CaptureEvent {
	id: string
	event: string
	properties?: Record<string, unknown>
	created_at: string
}
```

`event` names what happened (`player:track_play`, `player:track_end`). `properties` carries context: `track_id`, `play_id`, `ms_played`, `end_reason`, `reason_start`, and whatever else the caller passes.

## Functions

```js
addCaptureEvent(event, properties?)  // record any event, returns id
clearCaptureEvents()                 // wipe all local events
buildEndDataMap(allEvents, plays)    // pair track_play with track_end by play_id
```

`addCaptureEvent` is called from `analytics.capture()`, which also forwards to PostHog when the user has opted in. Storage stays local either way.

## Storage

Local only, in localStorage under `r5-capture-events`. No sync to remote — your listening habits remain your own.

## History page

`/history` filters `captureEventsCollection` for `player:track_play` events and pairs each with its `player:track_end` via `play_id`, to show duration and end reason. `/stats` aggregates the same data for listening statistics.

## Play count threshold

A play counts only after enough real listening — the Last.fm scrobble rule: full track if under 2 minutes, otherwise half the duration capped at 4 minutes. `getPlayCountThreshold(durationSec)` in `utils.ts` returns the required seconds.

`player:track_play` fires at playback start regardless. `ms_played` on `player:track_end` is accumulated real listening time (`deck.ms_listened`), not playhead position — seeks and pauses don't inflate it. The history UI compares `ms_played` to the threshold at read time to judge counted vs skipped. Plays without an end event yet show normally, not as skipped. Stats count only qualifying plays.
