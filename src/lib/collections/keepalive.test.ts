import {describe, expect, it} from 'vitest'
import {queuePinTargets} from './keepalive'

describe('queuePinTargets', () => {
	const lookup = (rows: Record<string, {slug?: string | null}>) => (id: string) => rows[id]

	it('pins by slug when the view or loaded rows name the channels, ephemeral rows by id', () => {
		const deck = {playlist_tracks: ['a', 'discogs-1'], playlist_slug: 'oskar', view: undefined}
		expect(queuePinTargets(deck, lookup({a: {slug: 'oskar'}, 'discogs-1': {slug: null}}))).toEqual({
			slugs: ['oskar'],
			ids: ['discogs-1']
		})
		const viewDeck = {
			playlist_tracks: ['a'],
			playlist_slug: undefined,
			view: {sources: [{channels: ['ko002', 'nomads']}]}
		}
		expect(queuePinTargets(viewDeck, lookup({}))).toEqual({slugs: ['ko002', 'nomads'], ids: []})
	})

	it('falls back to id pinning when slugs cannot be trusted', () => {
		// Half-loaded viewless queue: a slug pin derived from partial rows would evict the rest.
		const deck = {playlist_tracks: ['a', 'b'], playlist_slug: 'oskar', view: undefined}
		expect(queuePinTargets(deck, lookup({a: {slug: 'oskar'}}))).toEqual({
			slugs: [],
			ids: ['a', 'b']
		})
		// Too many channels (search/tag queues): pinning them whole loads far more than the queue.
		const ids = ['a', 'b', 'c', 'd', 'e']
		const rows = Object.fromEntries(ids.map((id, i) => [id, {slug: `chan-${i}`}]))
		const wideDeck = {playlist_tracks: ids, playlist_slug: undefined, view: undefined}
		expect(queuePinTargets(wideDeck, lookup(rows))).toEqual({slugs: [], ids})
	})
})
