<script lang="ts">
	import Icon from '$lib/components/icon.svelte'
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
		<span class="count-badge" title="{count} listener{count === 1 ? '' : 's'}">{count}</span>
	{/if}
</button>

<style>
	.count-badge {
		position: absolute;
		top: calc(-1 * var(--space-1));
		right: calc(-1 * var(--space-1));
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.1em;
		height: 1.1em;
		padding: 0 var(--space-1);
		font-size: var(--font-1);
		font-weight: 600;
		line-height: 1;
		color: var(--gray-1);
		background: var(--gray-12);
		border-radius: 1em;
		box-shadow: 0 0 0 1.5px var(--color-interface, var(--gray-1));
		pointer-events: none;
	}
</style>
