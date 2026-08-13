/**
 * The custom element "property upgrade" dance.
 *
 * Our media elements are defined lazily (`onMount` in player.svelte, because
 * `customElements.define` needs `HTMLElement` which doesn't exist during SSR).
 * So `<youtube-video>` is in the DOM as an unknown element for a few frames
 * before `customElements.define()` upgrades it.
 *
 * Anything that assigns a property in that window — e.g. player.svelte's
 * `applyInitialVolume()` doing `el.volume = 1` — creates a plain *own* data
 * property on the instance. Own properties shadow the class accessors forever
 * after the upgrade, so every later `el.volume = 0.5` silently writes to that
 * dead field and never reaches the provider API. Symptom: the UI moves, the
 * music doesn't.
 *
 * Fix (the standard pattern from the custom elements spec): on upgrade, take
 * any own value, delete the shadowing property, and re-assign it so it runs
 * through the real setter.
 *
 * @param {HTMLElement} el
 * @param {string[]} props
 */
export function upgradeProperties(el, props) {
	const target = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (el))
	for (const prop of props) {
		if (!Object.hasOwn(target, prop)) continue
		const value = target[prop]
		delete target[prop]
		target[prop] = value
	}
}
