# Untangling the sync model (broadcast / listen / auto-radio)

> Goal: collapse the three sync modes — broadcast, listen, auto-radio — into one shared shape, and make tuning in **additive** instead of wiping your session. Scoped to the sync tangle. Not a whole-app reshape.

**The plan, low → high risk** (detail in [Where to start](#where-to-start-risk-order-low--high); concepts defined below):

1. Collapse the two drift flags into one.
2. Define the `DeckClock` interface (copy the `MediaPlayer` pattern).
3. `deck.clock` tagged union on the Deck — kills both-set nonsense. Wire-neutral.
4. Make `joinBroadcast` additive — stop the global session teardown.
5. `broadcasting_channel_id` → one client-level `appState` flag.

## What this is _not_ (drift we cut)

This doc started as "make r4 mpv-like" and grew a six-module split (deck / player-runtime / layout / sync / commands / bindings), a telemetry-out step, and a bag-shake method. That was importing mpv's _shape_, not fixing an r4 _pain_. Dropped, and why:

- **Telemetry-out** (move `media_current_time` / `is_playing` etc. off the Deck into a runtime store) — a deck _has_ a duration and knows if it's playing. Splitting that off improves nothing for r4; the only win was deleting a tiny reset function already handled by persistence-by-omission. Cosplay. Cut.
- **Six-module split / "two primitives" framing** — organizing by mpv's anatomy, not r4's problems. Cut as a framing.
- **Command registry** (mpv `input.conf`) — real-ish (`can't "pause deck 2"` today), but nobody feels it as pain. Demoted to an open question at the bottom, not a plan step.

What's left is the part that's a genuine r4 mess.

---

## The problem — the sync trio is ONE concept in three costumes

- broadcast = _I am_ the timeline · listen = _a peer's_ · auto-radio = _a computed_ one. `universe.md`: "auto-radio is the same shared timeline without a broadcaster."
- Duplication visible **in the type itself**: `listening_drifted` + `auto_radio_drifted`. Same idea, twice.
- **Nonsense states are reachable.** No guard prevents `broadcasting_channel_id` AND `listening_to_channel_id` both set — `applyRemoteState` does a blind `Object.assign(deck, state)` (`api.ts:671`); only operation-sequencing saves us. A `deck.clock` tagged union makes the nonsense **unrepresentable**.
- **Blast radius: 217 refs / 28 files** (`listening_to_channel_id` 82, `broadcasting_channel_id` 44, `auto_radio` 39, `auto_radio_drifted` 26, `listening_drifted` 13, `auto_radio_rotation_start` 13). Real cost — but the union _reduces_ future blast radius (referenced once per use, not field-by-field).
- **Killer tell — two implementations of one concept.** `player/auto-radio.ts` is clean: 9 pure functions + one `AutoRadio` class, zero global state. `broadcast.js` shreds one "session" into **10 module-level Maps** (`broadcastChannels`, `broadcastStateListeners`, `seekJobSeqByDeck`, `tableWriteTimers`…) + 34 functions. Siblings that don't know they're siblings.

## The gift — you already solved this one floor up, in the player

Best-factored thing in the codebase (`api.ts:92`):

```ts
type MediaPlayer = HTMLElement & {paused; play(); pause(); currentTime; duration; volume; muted}
```

**One narrow interface, three wildly different backends** — `youtube-video` (iframe API), `soundcloud-player` (widget), native `<audio>` — each implements it; `getMediaPlayer(deckId)` picks one. From outside, all just `.currentTime` / `.play()`.

The sync trio is the **identical problem** (three backends: me / peer / computed) solved the **opposite** way (no interface, 10 Maps, 217 refs). So `DeckClock` isn't a scary new abstraction — it's **"make sync look like MediaPlayer"**:

```ts
type DeckClock = {currentTrack; position; isLive; drifted; resync()}
// broadcaster / listener / autoRadio implement it, like YT/SC/audio implement MediaPlayer
```

**Producer vs consumer (the one asymmetry).** broadcasting is a _producer_ — you drive your own playhead and _publish_ it outward; can't drift from yourself. listen + auto are _consumers_ — an external clock (a peer's push, or the formula) drives this deck's playhead, and drift/resync are the whole point. All three satisfy the one read interface: broadcaster trivially (it _is_ the source → `drifted=false`, `resync()` no-op), listener pulls from network, auto pulls from math. Producer is the degenerate backend.

## The model — TWO AXES, not one union

The earlier "4-way mode union" (`none|broadcaster|listener|auto`) was subtly wrong. Sync splits into **two orthogonal axes**:

**Axis 1 — clock (who drives _this deck's_ playhead).** Per deck, exactly one of:

- `self` — I drive it (manual playback)
- `listener(channel)` — a peer's broadcast drives it
- `auto(channel)` — the auto-radio formula drives it

This is the `DeckClock` consumer interface (canonical shape in Target outline); listener + auto are its backends, `self` is the trivial one. Mutually exclusive per deck → a **3-way** tag; listener+auto on one deck is the unrepresentable nonsense.

**Axis 2 — publish (is _this client_ going live).** Client-level — one app session, broadcasting as `appState.channels[0]`. Not a new entity: just "all the decks this client has open" (`appState.decks`). All-or-nothing: when broadcasting, **every non-listener deck** is published as a `decks[]` array (`getBroadcastDeckState`, broadcast.js:530). Membership by _exclusion_ (`getBroadcasterDeckIds` = decks without a listener clock, :454), covering `self` AND `auto` decks. Can't publish a listener deck (no rebroadcasting). One broadcast row per channel (`broadcast` table PK `channel_id`, `decks` JSONB).

`broadcasting_channel_id` (44 refs, per deck) is denormalized bookkeeping of this one client-level fact → collapses to a single `appState`-level flag + channel id. _Decided (Oskar): all-or-nothing is right — to keep a deck off air, pause or remove it. No per-deck publish control._

**Why two axes matter:** broadcasting is **orthogonal** to clock, not a fourth clock value. A deck can be `{clock: auto, published: true}` — auto-radio on your side, plain listener on the receiver's. So you listen on deck A and broadcast decks B+C at once; "both-set on one deck" stays impossible because publish is a _session_ flag, not a per-deck mode. The listener side mirrors the broadcaster's decks — `applyBroadcastState` spawns N decks to match the broadcaster's N (broadcast.js:710).

## Intent fix — listening must be additive

Today `joinBroadcast` tears down _all_ your decks before applying broadcast state (broadcast.js:160-165), so tuning in replaces your whole session — you can't have one deck on a broadcast and another on auto-radio. That's an intent bug: listening is a property of _one deck_, not a mode of the app. Tune-in should **add** listener deck(s) for that channel and leave other decks alone; reconciliation scoped to _that channel's_ listener decks, not the whole session.

**Composition lives at the client level.** Open four decks: one mirrors @ko002's live broadcast, one auto-radios that channel, one plays it manually, one plays another channel. The vision is _building blocks; obvious UI on top_. Each block is a command: `broadcast()` publishes your decks, `listen(channel, remoteDeckId)` adds _one_ listener deck mirroring _one_ remote deck, `autoRadio(channel)` computes one deck. "Mirror the whole broadcast" = call `listen` once per broadcaster deck; "follow just their main" = call it once. That default (1 vs N) is thin UI policy, changeable any day, not baked in.

**Two lifecycles:** broadcast↔listen mirror a client's decks (matched pair — what `broadcast.js`'s 10 Maps do today, unnamed); auto-radio computes one deck (the clean `player/auto-radio.ts` class). They share only Axis-1's consumer interface.

---

## Resolved intent (from Oskar)

1. **Two orthogonal axes, not one mode union.** Axis 1 (clock, per deck): `self | listener | auto` → `DeckClock` 3-way. Axis 2 (publish, per client): broadcasting on/off, publishes all non-listener decks. broadcast↔listen are a client-mirroring matched pair; auto-radio is a per-deck loner sharing only Axis-1's consumer interface. _Decided: `DeckClock` for Axis 1; a named client-mirroring module for Axis 2 (replaces the 10 Maps)._
2. **Composition is at the client level, not inside a deck.** Many decks, each one clean mode. Building blocks with obvious UI on top → each block is a command (`broadcast()`, `listen(ch)`, `autoRadio(ch)`).
3. **Broadcasting is a producer, listen/auto are consumers** — same read interface, opposite data-flow direction. Broadcaster is the degenerate (never-drifted) backend. Membership = "non-listener decks," so `broadcasting_channel_id` is redundant bookkeeping → one `appState` flag.
4. **Listening is additive and per-deck.** Tuning in adds listener deck(s); never wipes your session (fixes today's `joinBroadcast` global teardown). The primitive is `listen(channel, remoteDeckId)` on one deck; "mirror all N" vs "follow their main" is a UI default, not architecture. Reconciliation scoped to that channel's listener decks. _(Oskar leans "mirror all N" as default but not locked.)_
5. **Deck stays whole.** Telemetry (`media_current_time`, `is_playing`, …) stays on the Deck — a deck has a duration and knows if it's playing. No runtime-store split. _(Decided: reject the telemetry-out / six-module reshape as mpv cosplay.)_
6. **`DeckClock` = adapter (no storage); `deck.clock` = data on the Deck.** Reshape in place, not move out. The Axis-1 clock fields (`listening_to_channel_id`, `auto_radio`, `auto_radio_rotation_start`, + the 2 drift flags) collapse into one `deck.clock` tagged union still _on_ the Deck (`self | listener(channel) | auto(channel, rotationStart)`). (`broadcasting_channel_id` is Axis-2/publish — goes to the `appState` flag per #3, not into the union.) `DeckClock` owns zero state — like `getMediaPlayer(deckId)` reads the DOM element, `getClock(deck)` reads `deck.clock` + telemetry and computes `position / drifted / resync()`. Only `drifted` changes home: stored → computed getter (it was already derived in `player.svelte` then written back), so `listening_drifted` + `auto_radio_drifted` die. Nothing leaves the Deck except a cache.

## Naming — decided (2026-06-24)

- **Axis-1 clock** — field `deck.clock` + storage-less adapter `DeckClock` via `getClock(deck)` (shared root; matches the doc's own "clock" word). Replaces `SyncSession`/`deck.sync`. Module `src/lib/player/clock.ts`.
- **Clock kinds** — `self | listener | auto`, kept. `autoRadio(channel)` for the computed station. (`station`/`fm` considered, not adopted — `auto` is familiar and already everywhere.)
- _Avoided: `follow`/`unfollow` (collides with social following — channels have followers); `client`/`session` (TanStack owns `client`/`queryClient`, 31+33 refs)._
- **File move (decided):** `src/lib/broadcast.js` → `src/lib/player/broadcast.ts`, alongside the already-there `player/clock.ts` and `player/auto-radio.ts`. The whole sync trio lives under `player/`. JS → TS at the same time (the union needs types anyway).

## Still open (shape)

- **Command registry (demoted from the plan).** `keyboard.js > SHORTCUT_ACTIONS` is a half-built `{default, label, run}` registry — only 12 of 44 `api.ts` verbs registered, 6 of those hardcode `active_deck_id` so you can't express "pause deck 2." Real but unfelt. Revisit only if the sync work makes a target-arg dispatch convenient to land alongside.

## Target outline (the after-picture — read the goal off this)

The destination, stated as the `ast-grep outline` we want. Names marked _(open)_ aren't locked; the **shape** is. Canonical `DeckClock` lives here — all other mentions defer to this.

```
src/lib/player/clock.ts           // Axis 1 — clock. Storage-less adapter, copies MediaPlayer.
  type DeckClock = {currentTrack, position, isLive, drifted, resync()}
  getClock(deck) -> DeckClock      // picks backend off deck.clock, owns nothing
  // backends: self (trivial) / listener (pulls network) / auto (pulls formula)

src/lib/player/broadcast.ts       // Axis 2 — publish. Replaces 10 Maps + 4 start/stop pairs.
  startBroadcast(channel)  / stopBroadcast(channel)   // one lifecycle, not four
  publishDecks(channel)                                // push non-listener decks to remote
  listen(channel, remoteDeckId)                        // ADDITIVE — adds one listener deck
  resync(deckId)                                       // re-pull a drifted listener deck
  // no leave(): a listener deck dies via removeDeck(id), like any deck

src/lib/types.ts
  deck.clock: {kind:'self'} | {kind:'listener', channel} | {kind:'auto', channel, rotationStart}
  // replaces 5 flat clock fields; both-set won't compile; drifted is computed, not stored
```

**Vocabulary (old → new) — the point of the refactor is this column reads obvious:**

| today                                                                  | after                                  | why                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `joinBroadcast`                                                        | `listen(channel, remoteDeckId)`        | additive verb; says what it does, scoped to one deck                        |
| `leaveBroadcast`                                                       | `removeDeck(id)` _(exists)_            | additive killed the "leave a mode" concept — a listener deck is just a deck |
| `resyncBroadcastDeck`                                                  | `resync(deckId)`                       | shorter; the noun "broadcast deck" is gone                                  |
| `broadcasting_channel_id` (per deck, 44 refs)                          | `appState` publish flag + channel      | Axis-2 fact, one place not per-deck                                         |
| `listening_to_channel_id` / `auto_radio` / `auto_radio_rotation_start` | `deck.clock` union                     | one honest field, nonsense unrepresentable                                  |
| `listening_drifted` / `auto_radio_drifted`                             | `DeckClock.drifted` (computed)         | derived, not stored — two dup flags die                                     |
| 4× `start*/stop*` + 10 Maps                                            | `start/stopBroadcast` + `publishDecks` | one lifecycle, no hand-rolled subscription bookkeeping                      |

_Don't reuse: `follow`/`unfollow` (collides with social following — channels have followers); `client`/`session` (TanStack owns `client`/`queryClient`)._

## Where to start (risk order, low → high)

1. **Collapse the drift flags** — `listening_drifted` + `auto_radio_drifted` → one. Smallest, proves the "one concept" thesis on a 39-ref surface before the big union.
2. **`DeckClock` interface** — define it (canonical shape in Target outline); make broadcaster/listener/auto adapters over it (copy the `MediaPlayer` pattern). `player/auto-radio.ts` is already nearly an adapter.
3. **Sync union on the Deck** — `deck.clock` tagged union (`self | listener | auto`); kill the both-set nonsense; replace the blind `Object.assign` in `applyRemoteState`. Highest payoff, highest blast radius (217 refs / 28 files). _Wire-neutral: the clock fields never cross the wire — `getBroadcastDeckState` (broadcast.js:530) serializes only playback telemetry (`track_id`, `track_played_at`, `seeked_at`, `seek_position`, `speed`, volume/muted), and the wire type is owned by `@radio4000/sdk` (`BroadcastDeckState`). Listeners reconstruct their clock locally from that telemetry. So this reshape is local-only; no wire-format or remote-row migration, and broadcast rows are ephemeral live sessions anyway. Regression net: `broadcast.test.js` (113 lines) + `collections/broadcasts.test.js`._
4. **Additive `joinBroadcast`** — mostly deletion, not new sync logic. `applyBroadcastState` (broadcast.js:710) is _already_ additive and scoped: it adds the shortfall / trims the excess of decks where `listening_to_channel_id === channelId`, matches by `track_id`, and "never touch[es] unrelated local decks." The non-additive part is two teardown blocks bolted around it in `joinBroadcast`: (1) the top loop killing _other_ channels' state listeners on switch (~:129-138), and (2) the `for (const id of getSortedDeckIds()) removeDeck(id)` session-wipe before apply (:159-163). Delete both → join just ensures this channel's listener decks exist and match, leaving your self/auto decks and other-channel listeners alive (listen to @ko002 on deck A _and_ @ana on deck B). The dangerous reconciliation is written and tested; this step removes two loops. _(Separate, later: the `listen(channel, remoteDeckId)` primitive adds **one** listener deck per remote deck, so "mirror all N" = call it N times, "follow their main" = once — UI policy, not needed for additivity.)_
5. **`broadcasting_channel_id` → `appState` flag** — collapse the 44 per-deck refs to one client-level field once the union lands.

## How we know it worked (success bar)

`ast-grep`/`rg` outline getting smaller is the visible signal — but line-count is gameable (push mess sideways, outline shrinks, nothing better). Three layers, weakest → strongest:

**Layer 0 — the goal must be legible (formulate it, then read it back).** `ast-grep outline src/lib/broadcast.js` prints the structure: types, fields, fns, class methods. Today it reads as a _wall_ — four hand-rolled lifecycle pairs, each backed by its own Map:

```
startBroadcastLivenessMonitor / stopBroadcastLivenessMonitor
startBroadcastState           / stopBroadcastState
startBroadcastStateListener   / stopBroadcastStateListener
startBroadcastTableListener   / stopBroadcastTableListener
```

That start*/stop*/Map repetition _is_ the "10 Maps shred one session" tell, made visible. The goal stated as an outline: the new sync module's `ast-grep outline` reads as **one `DeckClock` with clear verbs** (one lifecycle, not four). If you can't read the intended shape off the outline, the goal isn't clear yet. This is the success bar's anchor — the others measure it.

**Layer 1 — shape shrinks (measurable, necessary, not sufficient).** The baseline below should drop. `ast-grep outline src/lib/broadcast.js` before/after = the diff to show.

**Layer 2 — nonsense unrepresentable (binary, not gameable).** Today you _can_ build a deck with `broadcasting_channel_id` AND `listening_to_channel_id` both set (only op-ordering saves us). After the `deck.clock` tagged union, that state won't typecheck. Test: try to construct it — won't compile = win. Can't be faked by moving code.

**Layer 3 — malleability (the real bar — "powerful, malleable").** Can you do these _without editing `broadcast.js` internals_:

- four-compose: deck A mirrors @ko002 live · deck B auto-radios same channel · deck C plays it manual · deck D another channel. Today impossible (`joinBroadcast` wipes session).
- add a 4th clock backend (e.g. a recorded timeline) by implementing `DeckClock` once — like a new media backend implements `MediaPlayer`. Adapter file + zero consumer edits = win.

Layers 1+2 can pass while code stays rigid; only Layer 3 proves malleable.

## Baseline snapshot — 2026-06-24 (the before-picture)

Measured, not estimated. Refresh before trusting; method at bottom.

|                      | `broadcast.js`           | `player/auto-radio.ts`      |
| -------------------- | ------------------------ | --------------------------- |
| lines                | 881                      | 198                         |
| module-level Maps    | **10**                   | 0                           |
| functions            | 34 (9 exported)          | 9 fns + 1 `AutoRadio` class |
| global mutable state | scattered across 10 Maps | none                        |

`broadcast.js` 10 Maps: `_lastLogged`, `broadcastChannels`, `broadcastStateChannels`, `broadcastLivenessMonitors`, `broadcastStateListeners`, `broadcastTableListeners`, `broadcastStateSeqByChannel`, `lastReceivedStateSeqByChannel`, `seekJobSeqByDeck`, `tableWriteTimers`.

Sync field refs (`rg -o '\bFIELD\b' src | wc -l`) — **217 total / 28 files**:

| field                       | refs |
| --------------------------- | ---- |
| `listening_to_channel_id`   | 82   |
| `broadcasting_channel_id`   | 44   |
| `auto_radio`                | 39   |
| `auto_radio_drifted`        | 26   |
| `listening_drifted`         | 13   |
| `auto_radio_rotation_start` | 13   |

Other anchors: `MediaPlayer` at `api.ts:92`, 3 backends. Both-set nonsense state: no guard. `joinBroadcast` global teardown at `broadcast.js:161-164` (`for ... getSortedDeckIds() → removeDeck(id)`); `applyBroadcastState` spawns N decks at `:710`; `getBroadcastDeckState` `:530`; `getBroadcasterDeckIds` `:454`.

_Method: `rg -o '\bFIELD\b' src | wc -l` per field; `rg -l '...' src | wc -l` for files; `rg -n '^(const|let) \w+ = new Map'` for Maps; `rg -nc '^(export )?(async )?function'` for fn count._
