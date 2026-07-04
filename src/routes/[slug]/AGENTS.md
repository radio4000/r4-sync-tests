# Channel pages

+layout.svelte loads the channel context shared by all subpages.

Shared per-page state lives next to the routes:

- channels-view-state.svelte.ts — display/order/direction persistence + name/slug filtering for the follower/following pages.
- matching-tracks-query.svelte.ts — the `?matching=@channel` comparison query used by the tracks and tags pages.

When guarding against a missing channel, check `channelCtx.isLoading` (like batch-edit does), not `!channel` — the latter flashes "channel not found" during load.
