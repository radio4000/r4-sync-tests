# Queue

Sidebar panel showing upcoming tracks.

Queue state in `appState`: `playlist_tracks` (ordered IDs), `playlist_tracks_shuffled` (shuffled copy), `playlist_track` (current), `shuffle` (which list to use).

Pure functions in `$lib/player/queue.ts` operate on `string[]` of track IDs: `queueNext`, `queuePrev`, `queueInsertManyAfter`, `queueRemove`, `queueShuffleKeepCurrent`, `queueRotate`, `queueUnique`.

The panel (`queue-panel.svelte`) resolves queued IDs against `tracksCollection` with Map lookups in playlist order — an `inArray` live query over a long queue blocks the main thread for seconds (see [tanstack](tanstack.md)). Searchable via fuzzysort. Left edge draggable to resize (200–800px, disabled on mobile).

Play history lives at `/history`, powered by [capture events](play-history.md).
