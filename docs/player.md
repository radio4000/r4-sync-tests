# Player

Uses [media-chrome](https://www.media-chrome.org/) with [media-now](https://github.com/radio4000/media-now) for media abstraction. Supports YouTube, SoundCloud, and audio file playback.

## Architecture

- `media-now` handles provider abstraction
- `youtube-video-custom-element.js` - YouTube IFrame API wrapper
- `soundcloud-player-custom-element.js` - SoundCloud Widget API wrapper
- Both implement HTMLMediaElement-compatible interface for media-chrome

## Multi-deck

The player supports multiple independent decks. Each deck has its own queue, active track, playback speed, volume, and layout config. Deck state lives in `appState.decks` — keyed by numeric ID.

## Shared controls

`speed-control.svelte` and `volume-control.svelte` are shared between `player.svelte` and `deck-compact-bar.svelte`.

## Key patterns

- Only render one player at a time, branching on `provider` (`{#if provider === 'youtube'}` / soundcloud / audio)
- Both players have `slot="media"` when active
- YouTube URLs converted to embed format (`/embed/VIDEO_ID`) in `#initializePlayer()`
- Use `loadVideoById()` for track changes, avoiding player re-initialization

## Keyboard navigation

Arrow keys navigate tracklists — up/down to move, enter/space to play the selected track.

## Seeking

`seekTo(seconds)` in `api.ts` queries the player element directly (`youtube-video` or `soundcloud-player`) and sets `currentTime`. The custom elements' setters await their internal `#loadComplete` promise before calling the provider API.

When seeking after a track change, use `requestAnimationFrame` to wait for Svelte to render the new element.

## State

`appState` stores app, user and player states.
The live `player.svelte` copies playback position and duration into `deck.media_current_time` / `media_duration` so the compact bar can show progress without its own media element.
`captureEventsCollection` records play events with start/end reasons (see [capture events](play-history.md)).

## Auto-radio

See [auto-radio.md](auto-radio.md).

## Layout

See [decks.md](decks.md) for the full component tree, layout flags, and deck anatomy.

## Background / lock-screen playback

Auto-advance and lock-screen controls (`navigator.mediaSession`) are expected to keep
working while the tab is backgrounded or the mobile screen is locked. Known gotchas,
so this doesn't get re-diagnosed blind next time:

- **`requestAnimationFrame` is fully suspended while `document.hidden`** (not
  throttled — zero callbacks), which includes a locked mobile screen. Any polling
  loop on the playback path must use `setTimeout`, not rAF (`waitForMediaPlayer` in
  `api.ts` was fixed for this; it's the same bug class commit `de3971f1` fixed
  elsewhere).
- **YouTube's iframe claims the Media Session for itself** whenever its own playback
  starts (and can do so again later), silently overwriting our metadata/handlers on
  Android. There's no way to prevent this from the host page — the mitigation is to
  keep reasserting ours: on every real "playing" event (`handlePlay`) and on a light
  recurring interval while playing (see `reassertMediaSession` in `player.svelte`),
  not just once at track start.
- **Chrome may bind action-handling authority to the frame that owns the actual
  playing media element, not whoever last called `setActionHandler`.** For a YouTube
  track that's YouTube's own nested, cross-origin iframe — which we cannot reach into
  to register handlers on, and which has no "next radio4000 track" concept of its own.
  If this is the deciding factor (still unconfirmed — needs a real Android device to
  verify, e.g. by comparing whether prev/next reliably show for SoundCloud/file tracks
  vs YouTube ones), reasserting harder from our side can't fully fix it, since the OS
  may simply not be listening to our frame for those two actions. `media-session-anchor.js`
  is an experiment against this: keep a genuinely-playing (but silent) `<audio>` element
  alive in our own top frame while a deck plays, on the bet that Chrome will then also
  treat _our_ frame as a legitimate media owner. Unconfirmed — remove it if it turns out
  not to matter.
- **iOS Safari / WebKit**: on affected iOS versions, `.play()` can silently fail when
  called from a backgrounded/locked context — see
  [WebKit bug 173332](https://bugs.webkit.org/show_bug.cgi?id=173332) (a long-running,
  recurring bug — fixed in 2019, reintroduced in iOS 15+). No effective workaround is
  known. iOS Safari also has no Wake Lock API at all, so `wake-lock.js` is a no-op
  there by design.
- **Playback can stall mid-track while locked without the media element reporting
  `paused`** — reported on Android/YouTube: video silently stops loading while locked,
  and briefly unlocking is what kicks it back into motion. `player.svelte` now runs
  two lines of defense, both calling the same `nudgeStalledPlayback()` (re-seek to the
  element's own current position, which forces the provider to re-buffer/reconnect,
  then `play()` again — harmless when nothing was actually stuck): a `visibilitychange`/
  `pageshow` handler that fires the instant the app is foregrounded, and a `setInterval`
  watchdog (not `requestAnimationFrame` — see above) that polls for stalled
  `currentTime` progress every ~6s. The watchdog is the one that can self-heal without
  the user unlocking at all — it relies on Chromium's documented exemption of
  audio-playing tabs from background timer throttling, so in principle it should still
  fire while locked. Unconfirmed on-device whether it actually does.
- **Firefox** (desktop and Android) has historically not implemented the Media
  Session API — nothing to fix on our end; Firefox users get whatever minimal default
  the browser provides. Worth re-checking on new Firefox releases.
- **Broadcast (listen) and auto-radio** funnel track changes through the same
  `playTrack()` → `waitForMediaPlayer()` path, so the rAF fix above covers them too.
  Broadcast already self-heals on foreground via `broadcast.js`'s
  `resumeBroadcastState` (`visibilitychange` + `pageshow`); auto-radio has the
  equivalent next to `resyncAutoRadio` in `api.ts`, resyncing any drifted deck instead
  of waiting for a manual tap on the "resync" affordance.
- **Lock-screen prev/next only make sense for a normal queue.** The in-app UI hides
  `btnPrev`/`btnNext` while listening to a broadcast or in auto-radio mode (you can't
  skip someone else's track, and skipping breaks auto-radio's deterministic schedule).
  `reassertMediaSession` mirrors that: `previoustrack`/`nexttrack` handlers are only
  registered when `!isListeningToBroadcast && !deck?.auto_radio`, so the OS doesn't
  show buttons the in-app UI wouldn't offer.
