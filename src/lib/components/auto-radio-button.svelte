<script lang="ts">
	import Icon from '$lib/components/icon.svelte'
	import PresenceCount from '$lib/components/presence-count.svelte'
	import * as m from '$lib/paraglide/messages'

	let {
		live = false,
		drifted = false,
		count = 0,
		title,
		ariaLabel,
		size = 16,
		class: className = '',
		...rest
	}: {
		live?: boolean
		drifted?: boolean
		count?: number
		title?: string
		ariaLabel?: string
		size?: number
		class?: string
		[key: string]: unknown
	} = $props()

	// Active = engaged and in sync. Drifted reads as a resync call-to-action, so it drops active.
	const resolvedTitle = $derived(title ?? (drifted ? m.auto_radio_resync() : m.auto_radio_join()))
	const resolvedAriaLabel = $derived(ariaLabel ?? resolvedTitle)
	// Only surface the badge when others are present (count includes you).
	const showCount = $derived(count > 1)
</script>

<button
	type="button"
	class={['auto-live-btn', {active: live && !drifted}, className]}
	title={resolvedTitle}
	aria-label={resolvedAriaLabel}
	{...rest}
>
	<Icon icon="infinite" {size} />
	{#if showCount}
		<PresenceCount {count} corner />
	{/if}
</button>
