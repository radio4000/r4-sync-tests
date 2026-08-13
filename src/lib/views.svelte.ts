import {fuzzySearch, shuffleArray} from '$lib/utils'
import {SvelteSet} from 'svelte/reactivity'
import {useLiveQuery} from '$lib/useLiveQuery.svelte'
import {createQuery, keepPreviousData} from '@tanstack/svelte-query'
import {inArray} from '@tanstack/db'
import {tracksCollection, normalizeTrackMedia} from '$lib/collections/tracks'
import {channelsCollection} from '$lib/collections/channels'
import {sdk} from '@radio4000/sdk'
import {searchTracks} from '$lib/search-fts'
import type {Channel, Deck, Track} from '$lib/types'
import {parseView, viewURI, type View, type ViewSource} from '$lib/views'

/** Max tracks fetched for client-side filtering (search, tags, channel+filter combos). */
const MAX_CLIENT_TRACKS = 4000
/**
 * Per-source cap for multi-source views. Multi is a snapshot (not a live query): each
 * source is fetched imperatively and the union happens client-side, so we bound each
 * source's fetch rather than relying on a single query's limit.
 */
const PER_SOURCE_CAP = 1000
const EMPTY_STRINGS: string[] = []

/**
 * Which fetch+filter path queryView should use for a View.
 * - `channel`: paginated local query by slug — fast, server-paginated
 * - `channel-filtered`: fetch all channel tracks, post-filter by tags/search, paginate client-side
 * - `tags-only`: remote Supabase overlaps query (tags column), post-filter for tagsMode=all
 * - `search-only`: local FTS live query
 * - `multi`: two or more non-empty sources, union of per-source fetches
 * - `empty`: no source specified, returns nothing
 */
export type ViewStrategy =
	| 'channel'
	| 'channel-filtered'
	| 'tags-only'
	| 'search-only'
	| 'multi'
	| 'empty'

type ProcessViewTracksOptions = {
	shuffleRand?: () => number
	/** Set when the caller already passes input sorted by created_at desc, so the default sort can be skipped. */
	inputOrder?: 'created-desc'
}

/** Decide which fetch strategy to use based on the first source of a View. */
export function resolveViewStrategy(source?: ViewSource): ViewStrategy {
	const hasChannels = !!source?.channels?.length
	const hasTags = !!source?.tags?.length
	const hasSearch = !!source?.search?.trim()
	if (hasChannels && (hasTags || hasSearch)) return 'channel-filtered'
	if (hasChannels) return 'channel'
	if (hasTags) return 'tags-only'
	if (hasSearch) return 'search-only'
	return 'empty'
}

/** Auto-radio decks matching a specific View identity. */
export function getAutoDecksForView(decks: Deck[], view?: View): Deck[] {
	const key = viewURI(view)
	return decks.filter((d) => d.auto_radio && viewURI(d.view) === key)
}

/**
 * Post-process raw tracks: tag post-filtering, fuzzy search, sort/shuffle.
 * This is the "refine locally" stage — input comes from a broad fetch (FTS, overlaps, or channel dump).
 */
export function processViewTracks(
	tracks: Track[],
	view: View,
	options: ProcessViewTracksOptions = {}
): Track[] {
	const data = filterSourceTracks(tracks, view.sources[0])
	return sortViewTracks(data, view, options)
}

/** Apply one ViewSource's tags/search filtering to a track list. Single source only. */
export function filterSourceTracks(tracks: Track[], source?: ViewSource): Track[] {
	let data = tracks
	// Tag post-filter: channel+tags always needs it; tags-only needs it for tagsMode=all
	// (Supabase overlaps = "any", so "all" mode requires a second pass here)
	if (source?.tags?.length) {
		if (source.tagsMode === 'all') {
			data = data.filter((t) => source.tags?.every((tag) => t.tags?.includes(tag)))
		} else if (source.channels?.length) {
			data = data.filter((t) => t.tags?.some((tag) => source.tags?.includes(tag)))
		}
	}
	if (source?.search) {
		data = fuzzySearch(source.search, data, ['title', 'description'])
	}
	return data
}

/** Apply a View's order/direction/shuffle to an already-filtered track list. */
export function sortViewTracks(
	tracks: Track[],
	view: View,
	options: ProcessViewTracksOptions = {}
): Track[] {
	let data = tracks
	// Default order is created_at desc; skip the re-sort when the caller says input already is.
	const isDefaultSort = !view.order && (!view.direction || view.direction === 'desc')
	const skipSort =
		isDefaultSort && !view.sources[0]?.search && options.inputOrder === 'created-desc'
	if (view.order === 'shuffle') {
		data = shuffleArray(data, options.shuffleRand ?? Math.random)
	} else if (!skipSort) {
		const sortField =
			view.order === 'name' ? 'title' : view.order === 'updated' ? 'updated_at' : 'created_at'
		const dir = view.direction === 'asc' ? 1 : -1
		data = data.toSorted((a, b) => {
			const va = a[sortField] ?? ''
			const vb = b[sortField] ?? ''
			return va < vb ? -dir : va > vb ? dir : 0
		})
	}
	return data
}

/** Dedupe tracks by id, keeping first occurrence. Preserves input order. */
export function dedupeTracksById(tracks: Track[]): Track[] {
	const seen = new SvelteSet<string>()
	const out: Track[] = []
	for (const t of tracks) {
		if (seen.has(t.id)) continue
		seen.add(t.id)
		out.push(t)
	}
	return out
}

/** Parse provider/media_id from URLs and upsert into local collection. */
function hydrateTracksFromRemote(data: Record<string, unknown>[]): Track[] {
	const tracks = (data as Track[]).map(normalizeTrackMedia)
	tracksCollection.utils.writeBatch(() => {
		for (const t of tracks) tracksCollection.utils.writeUpsert(t)
	})
	return tracks
}

/** Reactive view query. Call during component init. Returns {tracks, channels, loading, strategy} with getters. */
export function queryView(getView: () => View) {
	// Stable $derived primitives — only change when actual query params change.
	const channelSlugs = $derived(getView().sources[0]?.channels ?? EMPTY_STRINGS)
	const channelSlugsKey = $derived(channelSlugs.join(','))
	const tags = $derived(getView().sources[0]?.tags?.toSorted() ?? EMPTY_STRINGS)
	const tagsKey = $derived(tags.join(','))
	const searchTerm = $derived(getView().sources[0]?.search?.trim() || '')
	const limit = $derived(getView().limit ?? 50)
	const offset = $derived(getView().offset ?? 0)
	// Multi-source: all channel slugs across every source (superset, identical when single).
	const allChannelSlugs = $derived(getView().sources.flatMap((s) => s.channels ?? EMPTY_STRINGS))
	const allChannelSlugsKey = $derived(allChannelSlugs.join(','))
	const nonEmptySources = $derived(
		getView().sources.filter((s) => resolveViewStrategy(s) !== 'empty')
	)
	// Effective strategy: 'multi' when more than one non-empty source, else the single-source path.
	const strategy = $derived(
		nonEmptySources.length > 1 ? 'multi' : resolveViewStrategy(nonEmptySources[0])
	)

	const channelsQuery = useLiveQuery(
		(q) => {
			if (!allChannelSlugs.length)
				return q.from({c: channelsCollection}).where(({c}) => inArray(c.id, ['']))
			return q.from({c: channelsCollection}).where(({c}) => inArray(c.slug, allChannelSlugs))
		},
		[() => allChannelSlugsKey]
	)

	// Channel tracks: paginated when strategy=channel, full dump when strategy=channel-filtered
	const tracksQuery = useLiveQuery(
		(q) => {
			if (strategy !== 'channel' && strategy !== 'channel-filtered')
				return q.from({tracks: tracksCollection}).where(({tracks}) => inArray(tracks.id, ['']))
			const fetchAll = strategy === 'channel-filtered'
			return q
				.from({tracks: tracksCollection})
				.where(({tracks}) => inArray(tracks.slug, channelSlugs))
				.orderBy(({tracks}) => tracks.created_at, 'desc')
				.limit(fetchAll ? MAX_CLIENT_TRACKS : limit)
				.offset(fetchAll ? 0 : offset)
		},
		[
			() => strategy,
			() => channelSlugsKey,
			() => searchTerm,
			() => tagsKey,
			() => limit,
			() => offset
		]
	)

	// Remote tags query: Supabase overlaps (broad "any" match).
	// createQuery because TanStack DB's inArray can't do array-overlap client-side.
	// Keyed 'view-tracks', NOT 'tracks': tracksCollection owns the ['tracks', ...] namespace
	// and rewrites every cache entry under it on each collection write (query-db-collection
	// updateCacheData prefix-matches), which would clobber these snapshots. Same below.
	const tagsQuery = createQuery(() => {
		return {
			queryKey: ['view-tracks', 'tags', ...tags, 'limit', limit],
			queryFn: async () => {
				const {data, error} = await sdk.supabase
					.from('channel_tracks')
					.select('*')
					.overlaps('tags', tags)
					.order('created_at', {ascending: false})
					.limit(limit)
				if (error) throw error
				return hydrateTracksFromRemote(data || [])
			},
			enabled: strategy === 'tags-only',
			staleTime: 24 * 60 * 60 * 1000
		}
	})

	// Remote FTS query (like tagsQuery — client-side eq() can't match tsvector)
	const searchQuery = createQuery(() => {
		return {
			queryKey: ['view-tracks', 'search', searchTerm, 'limit', limit, 'offset', offset],
			queryFn: async () => {
				const {tracks, count} = await searchTracks(searchTerm, {limit, offset})
				return {tracks: hydrateTracksFromRemote(tracks), count}
			},
			enabled: strategy === 'search-only' && !!searchTerm,
			staleTime: 24 * 60 * 60 * 1000,
			placeholderData: keepPreviousData
		}
	})

	// Multi-source union: resolve each source imperatively (snapshot), then union+dedupe.
	const multiQuery = createQuery(() => {
		return {
			queryKey: ['view-tracks', 'multi', viewURI(getView())],
			queryFn: async ({queryKey}) => {
				// Re-parse sources from the key rather than closing over reactive state:
				// a fetch can outlive the view it was started for, and cached entries
				// must always match their key (staleTime is 24h).
				const keySources = parseView(String(queryKey[2])).sources.filter(
					(s) => resolveViewStrategy(s) !== 'empty'
				)
				const results: Track[] = []
				for (const source of keySources) {
					const strategy = resolveViewStrategy(source)
					let fetched: Track[] = []
					if (strategy === 'channel') {
						const slugs = source.channels ?? EMPTY_STRINGS
						const {data, error} = await sdk.supabase
							.from('channel_tracks')
							.select('*')
							.in('slug', slugs)
							.order('created_at', {ascending: false})
							.limit(PER_SOURCE_CAP)
						if (error) throw error
						fetched = hydrateTracksFromRemote(data || [])
					} else if (strategy === 'channel-filtered') {
						const slugs = source.channels ?? EMPTY_STRINGS
						const {data, error} = await sdk.supabase
							.from('channel_tracks')
							.select('*')
							.in('slug', slugs)
							.order('created_at', {ascending: false})
							.limit(PER_SOURCE_CAP)
						if (error) throw error
						fetched = filterSourceTracks(hydrateTracksFromRemote(data || []), source)
					} else if (strategy === 'tags-only') {
						const sourceTags = source.tags ?? EMPTY_STRINGS
						const {data, error} = await sdk.supabase
							.from('channel_tracks')
							.select('*')
							.overlaps('tags', sourceTags)
							.order('created_at', {ascending: false})
							.limit(PER_SOURCE_CAP)
						if (error) throw error
						fetched = filterSourceTracks(hydrateTracksFromRemote(data || []), source)
					} else if (strategy === 'search-only') {
						const {tracks} = await searchTracks(source.search ?? '', {limit: PER_SOURCE_CAP})
						fetched = filterSourceTracks(hydrateTracksFromRemote(tracks), source)
					}
					results.push(...fetched)
				}
				return dedupeTracksById(results)
			},
			enabled: strategy === 'multi',
			staleTime: 24 * 60 * 60 * 1000
		}
	})

	/** Raw tracks from whichever data source the current strategy uses. */
	function rawTracks(): Track[] {
		switch (strategy) {
			case 'channel':
			case 'channel-filtered':
				return (tracksQuery.data ?? []) as Track[]
			case 'tags-only':
				return (tagsQuery.data ?? []) as Track[]
			case 'search-only':
				return (searchQuery.data?.tracks ?? []) as Track[]
			case 'multi':
				return (multiQuery.data ?? []) as Track[]
			default:
				return []
		}
	}

	return {
		get strategy() {
			return strategy
		},
		get tracks() {
			if (strategy === 'multi') {
				const sorted = sortViewTracks(rawTracks(), getView())
				return sorted.slice(offset, offset + limit)
			}
			const processed = processViewTracks(rawTracks(), getView())
			if (strategy !== 'channel' && strategy !== 'empty' && strategy !== 'search-only') {
				return processed.slice(offset, offset + limit)
			}
			return processed
		},
		get count(): number {
			if (strategy === 'search-only') {
				return searchQuery.data?.count ?? 0
			}
			if (strategy === 'channel-filtered') {
				return processViewTracks(rawTracks(), getView()).length
			}
			return rawTracks().length
		},
		get channels() {
			return (channelsQuery.data ?? []) as Channel[]
		},
		get loading() {
			switch (strategy) {
				case 'channel':
				case 'channel-filtered':
					return !tracksQuery.isReady
				case 'tags-only':
					return tagsQuery.isPending
				case 'search-only':
					return searchQuery.isPending
				case 'multi':
					return multiQuery.isPending
				default:
					return false
			}
		}
	}
}
