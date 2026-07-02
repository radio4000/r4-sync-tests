# PLAN

Possible improvements. Roughly by priority. Verify before implementing.

Last update (2026-05-27): cleared done sections — see CHANGELOG.md for user-facing history.

## UI cleanup — mobile-first (in progress)

**Problem:** channel pages feel ~80% tappable (409 interactives on `@ko002` mobile). Compact deck and header are cramped and inconsistent.

**Workflow:** plan with Oskar → Sonnet implements → Fable-high reviews → iterate. Test channel: `@ko002`.

### Design principles (draft — Oskar to tweak)

1. One primary action per zone.
2. Static-by-default — tags/metadata earn a tap only when browsing is the intent.
3. Consistent deck — same control positions across play states; icons change, layout doesn't.
4. Progressive disclosure — secondary controls behind one overflow, not a scrolling icon row.
5. Mobile budget — deck bar: ≤4 always-visible transport controls + one overflow.

### Phase 1: compact deck (`deck-compact-bar.svelte`)

**Annotation:** `/tmp/deck_annotated_crop.png` (numbered overlay). React by # — green=keep, orange=demote, red=cut, blue=ambiguous.

**Open decisions from annotation:**
- **#9 vs #18** — two separate `⋯` menus in one bar (track actions vs deck actions). Merge into one overflow?
- **#3** channel micro-card — demote/cut when you're already on that channel?
- **#4** whole track row is a tap target *and* competes with bar-root active-deck click (#1)
- **#14–17** speed/volume — volume slider hidden <400px (done); speed left as settings opt-in

**Files:** `deck-compact-bar.svelte`, `track-card.svelte` (compact embed), `+layout.svelte` (listening group chrome), `docs/decks.md` (stale mobile note).

**Review rubric (Fable):** control count ≤5 visible taps; no horizontal scroll on controls row; play state doesn't reflow layout; `@ko002` playable at 390px width.

### Phase 2: header menu (later)

`layout-header.svelte`, `nav-popover.svelte` — after deck ships and reviews clean.

## Backlog

- Page metadata follow-ups — `Seo` is now the single metadata path (50 routes migrated, `plain` prop skips the `| {appName}` suffix). Remaining: stop baking brand names into i18n title strings so more routes can drop `plain`, and move default title/description in `src/app.html` to config-driven values (needs a `transformPageChunk` hook in `hooks.server.ts`).
- `userHasPlayed` not reset between playlists (`player.svelte`) — flag carries over when switching channels, may cause unexpected autoplay. Needs verification and user testing.
- `seekWhenReady` race in `broadcast.js` — between the final `seekJobSeqByDeck` check and `play(deckId)`, a new job could start. Old job's `play()` still fires. Needs verification and user testing.

## One day

- Test RTL support
- `TrackCard` parses `track.description` with LinkEntities on every render. Consider a DB trigger or cache.
- Media Session API — lock screen and notification controls (play/pause/skip/artwork). Needs research: YouTube/SoundCloud iframes set their own `mediaSession`, may conflict. Our next/prev/seek would work (we proxy via iframe APIs), but play/pause and metadata could fight the iframe.
- Duplicate track detection — warn when adding a URL that already exists in the channel. Could also surface in batch-edit (group by URL or `media_id`).
- Musicbrainz/discogs auto-matching has a high error rate. Let users mark metadata as wrong, or show an "unverified" badge.
- `src/lib/metadata/discogs-core.js` — in-memory fetch cache grows unbounded. 5-min TTL but no eviction. Long sessions accumulate entries. Could move to a db collection.
- Play history threshold: a track is recorded the moment it starts playing. Should count only after enough listening: full track if under 2 min, half the duration (max 4 min) otherwise. Open questions: accumulate actual play time vs. furthest position? What about pause/resume? Should skipped tracks get a `skipped` flag or disappear? Currently `capture('player:track_play')` fires in `playTrack()` (api.ts); would move to `player.svelte` using `timeupdate`. Needs `getPlayCountThreshold(durationSec)` helper and a way to pass `reason_start` to the player.

## Needs research

- Broadcast hard-fail cleanup — current auto-stop is client-side (idle/no-deck monitor). Consider server-side TTL/heartbeat expiry for cases like sudden process kill or network drop during tab close.

- Views beyond tracks — Views are currently tracks-centric: `ViewSource` describes track filters (`channels`, `tags`, `search`), `queryView` returns tracks, `processViewTracks` sorts/filters tracks. Explore whether Views could describe channels or mixed results too (e.g. `searchChannelsCombined` already runs parallel to `queryView` on search pages). Questions: would a `ViewResult` with `{tracks, channels}` simplify search pages further, or would it over-abstract a simple parallel call? Would saved views benefit from storing channel results? Is the current split (Views = tracks, channel search = separate) actually the clearest pattern? May conclude the current design is right and the abstraction isn't worth it.

- `fetchQuery` usage review — remaining: `[slug]/tracks/[tid]/(tabs)/related` still calls `queryClient.fetchQuery` in the component body (followers/following pages now go through `getChannelConnections`).

- atproto scrobbling — on play, write `fm.teal.alpha.feed.play` to the user's PDS via teal.fm's lexicon. Shared listening history across apps. Requires OAuth account linking, opt-in, one `createRecord` per play. Fire-and-forget, no sync. Proves out atproto OAuth plumbing for everything else.

- atproto as backend — sign in with Bluesky, sync channels/tracks. Major architectural shift. See github.com/radio4000/r4atproto
- Shared track_meta — collaborative metadata curation between users. See github.com/radio4000/r4-sync-tests/issues/6
- Hashtag parsing — should `"#one#two"` be one tag or two? Follow Twitter/Bluesky convention. Decide, update LinkEntities test and regexes. Parsing happens in Postgres, not the app — tests should use the same regexes. Same question applies to `parseQuery` in `views.ts`. Tokenizer splits on whitespace only.
