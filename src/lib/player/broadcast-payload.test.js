import {describe, it, expect} from 'vitest'
import {
	packEphemeralTrack,
	unpackEphemeralTrack,
	packPlaybackFields,
	pickPlaybackFields
} from './broadcast-payload'

describe('packPlaybackFields', () => {
	it('snapshots all playback fields, filling defaults for nullish values', () => {
		expect(packPlaybackFields(null)).toEqual({
			track_played_at: null,
			seeked_at: null,
			seek_position: null,
			is_playing: false,
			volume: 0,
			muted: false,
			speed: 1
		})
	})

	it('passes through present values', () => {
		const deck = {
			track_played_at: '2026-01-01T00:00:00Z',
			seeked_at: '2026-01-01T00:00:05Z',
			seek_position: 42,
			is_playing: true,
			volume: 0.5,
			muted: true,
			speed: 1.25
		}
		expect(packPlaybackFields(deck)).toEqual(deck)
	})

	it('keeps falsy-but-valid values like seek_position 0 and volume 0', () => {
		const out = packPlaybackFields({seek_position: 0, volume: 0, is_playing: false})
		expect(out.seek_position).toBe(0)
		expect(out.volume).toBe(0)
		expect(out.is_playing).toBe(false)
	})
})

describe('pickPlaybackFields', () => {
	it('returns empty patch for nullish or empty input', () => {
		expect(pickPlaybackFields(null)).toEqual({})
		expect(pickPlaybackFields({})).toEqual({})
	})

	it('copies only valid fields, skipping wrong-typed ones', () => {
		const patch = pickPlaybackFields(
			/** @type {any} */ ({
				is_playing: true,
				volume: 'loud',
				muted: false,
				speed: 2,
				seek_position: 10
			})
		)
		expect(patch).toEqual({is_playing: true, muted: false, speed: 2, seek_position: 10})
		expect('volume' in patch).toBe(false)
	})

	it('keeps seek_position 0 but drops null seek_position', () => {
		expect(pickPlaybackFields({seek_position: 0})).toEqual({seek_position: 0})
		expect(pickPlaybackFields({seek_position: null})).toEqual({})
	})

	it('drops empty-string timestamps', () => {
		expect(pickPlaybackFields({track_played_at: '', seeked_at: 'x'})).toEqual({seeked_at: 'x'})
	})

	it('round-trips a packed snapshot back to an equal patch', () => {
		const deck = {seek_position: 7, volume: 0.8, muted: true, is_playing: true, speed: 1}
		const wire = packPlaybackFields(deck)
		const patch = pickPlaybackFields(wire)
		expect(patch).toMatchObject(deck)
	})
})

describe('ephemeral track payload', () => {
	it('packs nothing for a db-id track', () => {
		expect(packEphemeralTrack({id: crypto.randomUUID(), url: 'x'})).toEqual({
			track_url: null,
			track_title: null,
			track_media_id: null
		})
	})

	it('packs url/title/media_id for a non-db track and unpacks it back', () => {
		const id = 'discogs:123'
		const packed = packEphemeralTrack({
			id,
			url: 'https://youtu.be/abc',
			title: 'Song',
			media_id: 'abc'
		})
		expect(packed).toEqual({
			track_url: 'https://youtu.be/abc',
			track_title: 'Song',
			track_media_id: 'abc'
		})
		const track = unpackEphemeralTrack(id, packed)
		expect(track).toMatchObject({id, url: 'https://youtu.be/abc', title: 'Song', media_id: 'abc'})
	})

	it('unpacks nothing without a url', () => {
		expect(unpackEphemeralTrack('discogs:1', {track_url: null})).toBeUndefined()
		expect(unpackEphemeralTrack(null, {track_url: 'x'})).toBeUndefined()
	})
})
