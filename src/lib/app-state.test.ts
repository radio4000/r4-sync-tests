import {beforeAll, describe, expect, test} from 'vitest'
import type {AppState} from './types'

const localStorageMock = {
	getItem: () => null,
	setItem: () => undefined,
	removeItem: () => undefined
}

beforeAll(() => {
	Object.defineProperty(globalThis, 'localStorage', {value: localStorageMock, configurable: true})
})

describe('app state persistence', () => {
	test('omits transient deck runtime fields from persisted state', async () => {
		const {createDefaultDeck, defaultAppState, serializeAppStateForStorage} = await import(
			'./app-state.svelte'
		)
		const deck = {
			...createDefaultDeck(1),
			playlist_slug: 'radio',
			playlist_track: 'track-1',
			clock: {kind: 'auto', rotationStart: 123} as const,
			view: {sources: [{channels: ['radio']}]},
			is_playing: true,
			drifted: true,
			play_id: 'play-1',
			track_played_at: '2026-05-26T00:00:00.000Z',
			seeked_at: '2026-05-26T00:00:01.000Z',
			seek_position: 42,
			media_current_time: 55,
			media_duration: 120
		}
		const state: AppState = {
			...defaultAppState,
			decks: {1: deck},
			next_deck_id: 3,
			active_deck_id: 1,
			broadcasting_channel_id: 'channel-1'
		}

		const persisted = serializeAppStateForStorage(state)
		const persistedDeck = (persisted.decks as Record<number, Record<string, unknown>>)[1]

		expect(persisted).not.toHaveProperty('broadcasting_channel_id')
		expect(persistedDeck.playlist_slug).toBe('radio')
		expect(persistedDeck.playlist_track).toBe('track-1')
		expect(persistedDeck.clock).toEqual({kind: 'auto', rotationStart: 123})
		expect(persistedDeck.view).toEqual({sources: [{channels: ['radio']}]})
		expect(persistedDeck).not.toHaveProperty('is_playing')
		expect(persistedDeck).not.toHaveProperty('drifted')
		expect(persistedDeck).not.toHaveProperty('play_id')
		expect(persistedDeck).not.toHaveProperty('track_played_at')
		expect(persistedDeck).not.toHaveProperty('seeked_at')
		expect(persistedDeck).not.toHaveProperty('seek_position')
		expect(persistedDeck).not.toHaveProperty('media_current_time')
		expect(persistedDeck).not.toHaveProperty('media_duration')
	})

	test('persists queue arrays separately', async () => {
		const {createDefaultDeck, serializeQueuesForStorage} = await import('./app-state.svelte')
		expect(
			serializeQueuesForStorage({
				1: {
					...createDefaultDeck(1),
					playlist_tracks: ['a', 'b'],
					playlist_tracks_shuffled: ['b', 'a']
				}
			})
		).toEqual({
			1: {
				playlist_tracks: ['a', 'b'],
				playlist_tracks_shuffled: ['b', 'a']
			}
		})
	})

	test('normalizing a loaded deck clears transient playback and sync fields', async () => {
		const {normalizeLoadedDeck} = await import('./app-state.svelte')
		const deck = normalizeLoadedDeck(2, {
			playlist_slug: 'radio',
			playlist_track: 'track-1',
			is_playing: true,
			clock: {kind: 'listener', channel: 'channel-2'},
			drifted: true,
			play_id: 'play-1',
			track_played_at: '2026-05-26T00:00:00.000Z',
			seeked_at: '2026-05-26T00:00:01.000Z',
			seek_position: 42,
			media_current_time: 55,
			media_duration: 120
		})

		expect(deck.id).toBe(2)
		expect(deck.playlist_slug).toBe('radio')
		expect(deck.playlist_track).toBe('track-1')
		expect(deck.is_playing).toBe(false)
		expect(deck.clock).toBeUndefined()
		expect(deck.drifted).toBeUndefined()
		expect(deck.play_id).toBeUndefined()
		expect(deck.track_played_at).toBeUndefined()
		expect(deck.seeked_at).toBeUndefined()
		expect(deck.seek_position).toBeUndefined()
		expect(deck.media_current_time).toBeUndefined()
		expect(deck.media_duration).toBeUndefined()
	})
})
