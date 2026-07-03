import {describe, expect, test} from 'vitest'
import {getPlayCountThreshold} from '$lib/utils'

describe('getPlayCountThreshold', () => {
	test('returns full duration for tracks under 2 minutes', () => {
		expect(getPlayCountThreshold(90)).toBe(90)
		expect(getPlayCountThreshold(119)).toBe(119)
	})

	test('returns half duration for tracks 2 minutes or longer', () => {
		expect(getPlayCountThreshold(120)).toBe(60)
		expect(getPlayCountThreshold(300)).toBe(150)
		expect(getPlayCountThreshold(600)).toBe(240)
	})

	test('caps threshold at 4 minutes', () => {
		expect(getPlayCountThreshold(800)).toBe(240)
		expect(getPlayCountThreshold(1000)).toBe(240)
	})

	test('falls back to 4 minutes when duration is unknown', () => {
		expect(getPlayCountThreshold()).toBe(240)
		expect(getPlayCountThreshold(null)).toBe(240)
		expect(getPlayCountThreshold(0)).toBe(240)
	})
})
