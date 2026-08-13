<script>
	import {page} from '$app/state'
	import {eq} from '@tanstack/db'
	import {useLiveQuery} from '$lib/useLiveQuery.svelte'
	import {channelsCollection} from '$lib/collections/channels'
	import {tracksCollection, ensureTracksLoaded} from '$lib/collections/tracks'
	import {fetchChannelBySlug} from '$lib/api/fetch-channels'
	import {setContext} from 'svelte'

	/** @type {{children: import('svelte').Snippet}} */
	const {children} = $props()

	const slug = $derived(page.params.slug ?? '')

	const channelQuery = useLiveQuery((q) =>
		slug
			? q
					.from({channels: channelsCollection})
					.where(({channels}) => eq(channels.slug, slug))
					.findOne()
			: null
	)

	const tracksQuery = useLiveQuery((q) =>
		slug
			? q
					.from({tracks: tracksCollection})
					.where(({tracks}) => eq(tracks.slug, slug))
					.orderBy(({tracks}) => tracks.created_at, 'desc')
			: null
	)

	$effect(() => {
		if (!slug) return
		const currentSlug = slug
		void (async () => {
			if (!channelsCollection.isReady()) await channelsCollection.preload()
			const existing = [...channelsCollection.state.values()].find((c) => c?.slug === currentSlug)
			if (!existing) {
				const fetched = await fetchChannelBySlug(currentSlug)
				if (fetched) channelsCollection.utils.writeUpsert(fetched)
			}
			await ensureTracksLoaded(currentSlug)
		})()
	})

	const channel = $derived(channelQuery.data)
	const tracks = $derived(tracksQuery.data ?? [])

	setContext('m-channel', {
		get slug() {
			return slug
		},
		get channel() {
			return channel
		},
		get tracks() {
			return tracks
		},
		get isLoading() {
			return !channel && (channelQuery.isLoading || tracksQuery.isLoading)
		}
	})
</script>

{@render children()}
