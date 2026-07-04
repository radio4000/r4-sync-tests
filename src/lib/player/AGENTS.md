# Player internals

player.svelte (in ../components) is the per-deck playback UI — one instance per deck, keyed by deckId which never changes across its lifetime (hence the `untrack()` around `createDeckDisplay`). Architecture in docs/player.md and docs/decks.md; auto-radio in docs/auto-radio.md; queue math in docs/queue.md.

- deck-display.svelte.ts — single source of truth for what the UI should display right now: the `track ?? broadcastTrack ?? lastTrack` fallback chains. Don't re-derive these ad hoc.
