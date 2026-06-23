import {channelsCollection} from '$lib/collections/channels'
import {queryClient} from '$lib/collections/query-client'
import {fetchRecentTracksForSlugs} from '$lib/collections/tracks'
import {sdk} from '@radio4000/sdk'
import {featuredScore, seededRandom, shuffleArray} from '$lib/utils'
import type {Channel} from '$lib/types'

/** Today as a stable seed (YYYY-MM-DD) for daily-rotating picks. */
export function dailySeed(): string {
	return new Date().toISOString().slice(0, 10)
}

/**
 * Pick featured channels from a pool: score a quality window, then shuffle it
 * down to `count`. Pass a stable `seed` (e.g. dailySeed()) for daily rotation,
 * or a random one to reshuffle. Without a seed, picks randomly each call.
 * Shared by the homepage and the /featured explore page so both rotate alike.
 */
export function pickFeatured(
	pool: Channel[],
	{count = 12, window = 40, seed}: {count?: number; window?: number; seed?: string} = {}
): Channel[] {
	const top = pool
		.toSorted((a, b) => featuredScore(b) - featuredScore(a))
		.slice(0, Math.max(window, count))
	return shuffleArray(top, seed ? seededRandom(seed) : Math.random).slice(0, count)
}

/**
 * Load the quality channel pool and return it.
 * Fetches via queryClient (cached, respects staleTime) and writes into
 * channelsCollection so other parts of the app can use these channels.
 */
export async function getFeaturedPool(days = 30): Promise<Channel[]> {
	const since = new Date(Date.now() - days * 86400000).toISOString()
	try {
		const data = await queryClient.fetchQuery({
			queryKey: ['channels', 'featured-pool'],
			staleTime: 60 * 60 * 1000,
			queryFn: async () => {
				const {data, error} = await sdk.supabase
					.from('channels_with_tracks')
					.select('*')
					.gte('track_count', 10)
					.not('image', 'is', null)
					.order('latest_track_at', {ascending: false})
					.limit(200)
				if (error) throw error
				return (data ?? []) as Channel[]
			}
		})
		if (data.length) {
			await (channelsCollection.isReady() ? Promise.resolve() : channelsCollection.preload())
			channelsCollection.utils.writeBatch(() => {
				for (const ch of data) channelsCollection.utils.writeUpsert(ch)
			})
		}
		return data.filter((ch) => ch.latest_track_at && ch.latest_track_at >= since)
	} catch (e) {
		console.warn('[featured] failed to load channel pool', e)
		return []
	}
}

/**
 * Load top `count` featured channels by score and fetch their recent tracks.
 * Results land in tracksCollection.state — read from there after awaiting.
 * Returns the picked channels.
 */
export async function loadFeaturedChannelTracks(count = 3, days = 30): Promise<Channel[]> {
	const pool = await getFeaturedPool(days)
	const since = new Date(Date.now() - days * 86400000).toISOString()
	const picked = pool.toSorted((a, b) => featuredScore(b) - featuredScore(a)).slice(0, count)
	if (picked.length) {
		await fetchRecentTracksForSlugs(
			picked.map((ch) => ch.slug),
			since
		)
	}
	return picked
}
