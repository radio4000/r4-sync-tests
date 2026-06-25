# Broadcast lifecycle refactor — why look

`broadcast.js` holds **9 module-level Maps** + **5 hand-rolled `start*/stop*` pairs** doing the same job in five costumes. The state refactor (deck.clock, client-level publish flag) is done; this is the remaining mess, and it's a different axis: not _what's stored_, but _subscription/lifecycle bookkeeping_.

## The tell

Maps (all keyed by channelId or deckId, all manually added/deleted):

- `broadcastChannels`
- `broadcastStateChannels`
- `broadcastLivenessMonitors`
- `broadcastStateListeners`
- `broadcastTableListeners`
- `broadcastStateSeqByChannel`
- `lastReceivedStateSeqByChannel`
- `seekJobSeqByDeck`
- `tableWriteTimers`

Lifecycle pairs (each owns one Map, each repeats the same has/set/get/delete dance):

- `startBroadcast` / `stopBroadcast`
- `startBroadcastState` / `stopBroadcastState`
- `startBroadcastStateListener` / `stopBroadcastStateListener`
- `startBroadcastTableListener` / `stopBroadcastTableListener`
- `startBroadcastLivenessMonitor` / `stopBroadcastLivenessMonitor`
- orphan: `stopBroadcastSync` (no matching start)

## Why it matters

- **One subscription = five places.** Joining/leaving a channel touches several Maps in lockstep. Easy to leak (subscribe without teardown) or double-fire. The `seekWhenReady` race in `plan.md` lives here.
- **No single source of truth for "am I subscribed to channel X."** State is smeared across Maps; correctness depends on every pair agreeing.
- **Five lifecycle pairs are one concept.** "Own a per-channel/per-deck resource, start it, stop it, clean up." Collapse to one resource-manager shape and the per-pair boilerplate disappears.

## Why now

State refactor cleared the prerequisite: publish is now `appState.broadcasting_channel_id` (one fact), so lifecycle code no longer scans decks to know what to start/stop. The shape is ready to simplify.

## Risk

Highest-risk item left. Live realtime code, thin coverage — `broadcast.test.js` only tests `calculateSeekTime`. Needs browser verification, not just unit tests. Question the shape before rewriting; don't change for change's sake.
