# Components

Local gotchas beyond docs/code-style.md:

- Use `{#snippet}` to dedupe 3+ near-identical render branches in one file (see tracklist.svelte's `trackItem`) — not a helper function returning a props object.
- Map components: see the header comment in map.svelte for how the map family composes.
