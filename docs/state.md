# Data and state

## Remote

Supabase PostgreSQL is the source of truth. Access via [`@radio4000/sdk`](radio4000-sdk.md) or the `r4` CLI. See [reference.json](reference.json) for all available methods.

## App state

`appState` is a Svelte-reactive global object persisted to localStorage (`app-state.svelte.ts`). Holds deck/player state, queue contents, user settings, UI preferences — anything that should survive page refresh but isn't synced to the server. See `AppState` and `Deck` types in `types.ts`.

Persistence is split into two localStorage keys: one for general state, one for queue arrays (to avoid serializing large arrays on every small change).

Transient deck runtime fields are intentionally excluded from persistence: media progress (`media_current_time`, `media_duration`), live/broadcast listening flags, drift flags, and play/seek timestamps reset on reload.

## Local sync and caching

Data flows from remote to components through a caching layer:

```
Remote (Supabase) → Query Cache (memory) → Collection (memory) → useLiveQuery → Component
```

When a component calls `useLiveQuery`, the collection checks the query cache. If data exists and is fresh (see cache config), it's used directly. If stale or missing, it fetches from remote via the collection's `queryFn()`. Collections use on-demand sync — live queries drive all fetching; nothing is prefetched up front.

IndexedDB persistence is currently **disabled**: both `collection-persistence.ts` (`collectionsHydrated`) and `query-cache-persistence.ts` (`cacheReady`) export resolved stubs while data-flow bugs are debugged. The persister code (including `shouldDehydrateQuery`, which limits persistence to small canonical snapshots) is kept in `query-cache-persistence.ts` for re-enabling. Until then the cache lives in memory only and every session starts cold.

On app boot (`+layout.js`):

1. `collectionsHydrated` and `cacheReady` — currently no-ops (see above)
2. `preload()` — load seed channels (embed/local modes), validate broadcast listening state, restore tracks for saved deck queues via `ensureTracksLoaded()`, expose `window.r5` debug handles
3. `useLiveQuery` in routes/components fetches on demand, populates collections
4. `checkTracksFreshness()` validates per-channel tracks against remote (see `tracks.ts`) — if outdated, triggers background refetch

For the full picture on collections, queries, mutations, and live queries, see [tanstack.md](tanstack.md).

## Channels

Channels are not preloaded (they were once — replaced with dynamic queries). The `channelsCollection` is on-demand: each page's live query fetches the subset it needs, and the collection's `queryFn` serves repeat requests from cache (delta-fetching only missing rows for pagination and id lookups).
