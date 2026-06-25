# Broadcast feature

This allows any user to broadcast (sync) their `appState.decks` to listeners in realtime via Supabase.

A user broadcasts as their channel — one `broadcast` row per channel (PK `channel_id`). The row's `decks` JSONB column mirrors the broadcaster's local deck state (`BroadcastDeckState[]`): broadcasting ships _all_ the broadcaster's non-mirror decks. To keep a deck off air, pause or remove it.

Whether you're live is tracked by `appState.broadcasting_channel_id` — the channel you're broadcasting as, or undefined (one at a time). Mirroring is per-deck on `deck.clock` (see [decks](decks.md)).

`joinBroadcast(channelId)` is additive: it ensures this channel's mirror decks exist and match the broadcast, leaving your other decks alone. One mirror deck per broadcaster deck (matched by `track_id`, else positionally). Drop a channel with `leaveBroadcast`/`removeDeck`. When the broadcaster changes tracks, seeks, or adjusts any deck — including volume — listeners update.

```
broadcaster: appState.decks → broadcast.decks (remote) → realtime → listeners
```

## Core functions

- `startBroadcast` / `stopBroadcast` — broadcaster creates/removes the remote row
- `joinBroadcast` / `leaveBroadcast` — listener subscribes/unsubscribes
- `upsertRemoteBroadcast` — pushes current deck state to remote (called automatically on track changes)
- `resyncBroadcastDeck` — re-syncs one drifted mirror deck to current broadcast state without rebuilding the deck layout
- `calculateSeekTime` — computes expected listener seek position from broadcast state (speed-aware)

Wire serialization lives in `player/broadcast-payload.js`, one field-set driving both directions so send and apply can't drift:

- `packPlaybackFields` / `pickPlaybackFields` — snapshot a deck's playback fields onto the wire, and copy only valid wire fields back onto a deck
- `packEphemeralTrack` / `unpackEphemeralTrack` — ship/reconstruct non-DB tracks (Discogs matches, local imports) listeners can't look up by id

## Broadcaster cleanup

Broadcast cleanup is handled inside `broadcast.js` liveness monitoring (not UI handlers):

- If no local broadcaster deck is left (all decks closed or only mirror decks remain), broadcast stops.
- If no local broadcaster deck has a currently playing track for `10s`, broadcast stops.
- `beforeunload` cleanup still runs from layout to clear local state when tab closes.

## Drift and resync

Listeners continuously compare local playback against expected broadcast position.

- Expected position is derived from `track_played_at` / `seeked_at` / `seek_position` + `speed`.
- Re-seek is skipped if already within a `2s` tolerance.
- `deck.drifted` is computed in `player.svelte` from this expected position (one flag shared with auto-radio — a deck only ever has one clock).

## Deck UI

Deck/channel headers show mirror context as linked `@who` + linked `@whom`:

- `who` = broadcaster slug
- `whom` = current track slug when available, fallback to playlist/mirror slug

In the deck player, a full-width Live mode button sits below the header and above the video. It includes mode status, listener count, and re-sync action when drifted (`resyncBroadcastDeck`).

## Files

- `src/lib/broadcast.js` — core logic. Realtime resources live in one `subs` registry keyed by `role:channelId` (producer/consumer subs share a channel name but run opposite directions); each entry owns its `stop()`.
- `src/lib/player/broadcast-payload.js` — wire (de)serialization of playback fields and ephemeral tracks
- `src/lib/player/clock.ts` — `deck.clock` identity reads (`isMirroring`, `mirroredChannelId`)
- `src/lib/collections/broadcasts.js` — collection with realtime subscription
- `src/routes/broadcast/+page.svelte` — list page
- `src/lib/components/broadcast-controls.svelte` — UI

## Types

See `types.ts`: `Deck`, `DeckClockState`, `BroadcastDeckState`, `BroadcastWithChannel`
