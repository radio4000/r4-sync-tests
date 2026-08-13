/**
 * "Bag" for the /m prototype — a mix you assemble by tapping [+]
 * on sources (channels, tags, searches) as you browse. Ingredients are
 * sources, not tracks; the bag serializes to a multi-source ViewURI
 * (docs/views.md) that queryView resolves and bag-pocket plays.
 */

import {LOCAL_STORAGE_KEYS} from '$lib/storage-keys'

/** @typedef {{id: string, kind: 'channel' | 'tag' | 'search', label: string, slug?: string, image?: string}} BagIngredient */

/** @param {unknown} value */
function hydrate(value) {
	if (!Array.isArray(value)) return []
	return value.filter((item) => {
		return (
			item &&
			typeof item === 'object' &&
			typeof item.id === 'string' &&
			['channel', 'tag', 'search'].includes(item.kind) &&
			typeof item.label === 'string'
		)
	})
}

let initial
if (typeof localStorage !== 'undefined') {
	try {
		initial = hydrate(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.bag) || '[]'))
	} catch {
		initial = []
	}
}

export const bag = $state({
	/** @type {BagIngredient[]} */
	ingredients: initial || []
})

function save() {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(LOCAL_STORAGE_KEYS.bag, JSON.stringify(bag.ingredients))
	}
}

/**
 * @param {BagIngredient['kind']} kind
 * @param {string} value
 */
function key(kind, value) {
	return `${kind}:${value.trim().toLowerCase()}`
}

/**
 * @param {BagIngredient['kind']} kind
 * @param {string} value
 */
export function inBag(kind, value) {
	const id = key(kind, value)
	return bag.ingredients.some((item) => item.id === id)
}

/** @param {BagIngredient} ingredient */
function toggle(ingredient) {
	const index = bag.ingredients.findIndex((item) => item.id === ingredient.id)
	if (index >= 0) bag.ingredients.splice(index, 1)
	else bag.ingredients.push(ingredient)
	save()
}

/** @param {import('$lib/types').Channel} channel */
export function toggleChannel(channel) {
	toggle({
		id: key('channel', channel.slug),
		kind: 'channel',
		label: channel.name || `@${channel.slug}`,
		slug: channel.slug,
		image: channel.image ?? undefined
	})
}

const leadingHash = /^#/

/** @param {string} tag */
export function toggleTag(tag) {
	const clean = tag.trim().replace(leadingHash, '')
	toggle({id: key('tag', clean), kind: 'tag', label: clean})
}

/** @param {string} query */
export function toggleSearch(query) {
	const clean = query.trim()
	if (clean) toggle({id: key('search', clean), kind: 'search', label: clean})
}

/** @param {string} id */
export function removeIngredient(id) {
	const index = bag.ingredients.findIndex((item) => item.id === id)
	if (index >= 0) bag.ingredients.splice(index, 1)
	save()
}

export function clearBag() {
	bag.ingredients.length = 0
	save()
}

/** The bag as a multi-source ViewURI: one source per ingredient, shuffled. */
export function bagViewURI() {
	if (!bag.ingredients.length) return ''
	const sources = bag.ingredients.map((item) => {
		if (item.kind === 'channel') return `@${item.slug}`
		if (item.kind === 'tag') return `#${item.label}`
		return item.label
	})
	return `${sources.join(';')}?order=shuffle`
}
