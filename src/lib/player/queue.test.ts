import {describe, expect, it} from 'vitest'
import {queueNext, queuePrev, queueInsertManyAfter} from './queue'

const queue = ['a', 'b', 'c', 'd', 'e']

describe('queue navigation', () => {
	it('queueNext returns next item', () => {
		expect(queueNext(queue, 'b')).toBe('c')
		expect(queueNext(queue, 'e')).toBeNull()
		expect(queueNext(queue, 'x')).toBeNull()
	})

	it('queuePrev returns previous item', () => {
		expect(queuePrev(queue, 'c')).toBe('b')
		expect(queuePrev(queue, 'a')).toBeNull()
		expect(queuePrev(queue, 'x')).toBeNull()
	})
})

describe('queue insertion', () => {
	it('queueInsertManyAfter inserts multiple items', () => {
		expect(queueInsertManyAfter(queue, 'b', ['x', 'y'])).toEqual([
			'a',
			'b',
			'x',
			'y',
			'c',
			'd',
			'e'
		])
		expect(queueInsertManyAfter(queue, 'missing', ['x'])).toEqual(['a', 'b', 'c', 'd', 'e', 'x'])
	})
})
