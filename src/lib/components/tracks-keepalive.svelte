<script lang="ts">
	import {inArray} from '@tanstack/db'
	import {tracksCollection} from '$lib/collections/tracks'
	import {useLiveQuery} from '$lib/useLiveQuery.svelte'

	// Holds a deck's queue tracks resident in the on-demand collection for as long
	// as this component is mounted, so navigating away doesn't GC the playing track
	// (which nulls `provider` and tears down the media element — stopping playback).
	// Pins by id, not slug, so multi-channel queues (views, search) stay covered.
	// The caller keys this per deck, so one deck's queue changing never disturbs
	// another's pin.
	let {ids}: {ids: string[]} = $props()

	useLiveQuery(
		(q) => (ids.length ? q.from({t: tracksCollection}).where(({t}) => inArray(t.id, ids)) : null),
		[() => ids.join(',')]
	)
</script>
