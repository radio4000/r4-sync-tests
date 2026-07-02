<script lang="ts">
	import {getChannelNavCtx} from '$lib/contexts'
	import {beforeNavigate, afterNavigate} from '$app/navigation'

	let {controls} = $props()

	let navCtx: ReturnType<typeof getChannelNavCtx> | undefined
	try {
		navCtx = getChannelNavCtx()
	} catch {
		navCtx = undefined
	}

	$effect(() => {
		if (!navCtx) return
		navCtx.setControls(controls)
		return () => navCtx!.setControls(undefined)
	})

	// `controls` is a page-owned snippet rendered by the layout. Clear it before
	// this page tears down, otherwise the layout renders it for one tick after the
	// page's deriveds go inert (svelte derived_inert). afterNavigate re-asserts for
	// same-route navigations (e.g. query changes) where this page stays mounted.
	beforeNavigate(() => navCtx?.setControls(undefined))
	afterNavigate(() => navCtx?.setControls(controls))
</script>
