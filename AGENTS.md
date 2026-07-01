Radio4000 is a music curation platform. People create radio channels and collect tracks — links to music on YouTube, Discogs, and other sources. You reference and annotate media, you never host it. Human curation over algorithms, since 2014.

This repo (`github.com/radio4000/r4-svelte`) is the SvelteKit frontend. It uses Svelte, `@radio4000/sdk` (Supabase data layer), TanStack DB (local-first sync), and `media-now` (URL parsing). The domain model: channels, tracks, views, decks, broadcast — is explained in [universe](docs/universe.md).

## Workflow

For any task or question:

1. Read docs first — scan `docs/reference.json` for relevant APIs. Read any topic-specific doc inside `docs/`. Most answers are already there. Assess whether existing APIs cover the task or if new concepts are needed.
2. Ask clarifying questions before exploring the entire code base, or when the task is ambiguous
3. Update @plan.md and docs where needed — delete done items from plan

```
/src/routes           -- pages
/src/lib/types.ts     -- type definitions
/src/lib/api.ts       -- data operations
/src/lib/utils.ts     -- utility functions
/src/lib/collections  -- data and state
/src/lib/components   -- components
```

Verify with `bun run test` (one known failing test is expected), `bun run types`, `bun run lint`.

Be concise. Short answers, no walls of text.

Name CSS classes by primitive/identity (`tabs`, `btn`, `chip`, `link`, etc.), not by location (`explore-section-menu`) — reusable vocabulary styled once in `src/styles/`.

## Key docs

- [reference](docs/reference.json) - scan for relevant functions, SDK methods, components, types. Maintained by hand — update it when you add or change APIs (`sg-ast outline` helps list what's where)
- [universe](docs/universe.md) - domain model: channels, tracks, views, decks, broadcast, auto-radio
- [state](docs/state.md) - how data flows (remote, local sync, app state)
- [tone](docs/tone.md) - voice and tone for all copy (UI, docs, changelog)
- [code-style](docs/code-style.md) - code conventions, HTML/CSS, Svelte, global styles
- [tanstack](docs/tanstack.md) - TanStack DB deep-dive
- See `docs/` for topic-specific docs (player, search, broadcast, etc.)

## Debug

`window.r5` exposes `sdk`, `appState`, `queryClient`, `tracksCollection`, `channelsCollection` for console testing.
Playground routes live under `/src/routes/docs` alongside their markdown docs.
The `r4 --help` CLI can help inspect data from remote PostgreSQL.
Test inside browsers with [browser-testing](docs/browser-testing.md) and `agent-browser`.
