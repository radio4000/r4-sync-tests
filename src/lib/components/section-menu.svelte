<script module>
	import {resolve} from '$app/paths'
	import * as m from '$lib/paraglide/messages'

	/**
	 * Items for the channel page nav (tracks/tags/mentions/following/followers).
	 * @param {{slug: string, trackCount?: number, routeId?: string | null}} params
	 */
	export function channelSectionMenuItems({slug, trackCount = 0, routeId}) {
		return [
			{
				href: resolve('/[slug]/tracks', {slug}),
				label: `${m.nav_tracks()} (${trackCount})`,
				active: routeId?.startsWith('/[slug]/tracks')
			},
			{
				href: resolve('/[slug]/tags', {slug}),
				label: m.channel_tags_link(),
				active: routeId?.startsWith('/[slug]/tags')
			},
			{
				href: resolve('/[slug]/mentions', {slug}),
				label: 'Mentions',
				active: routeId?.startsWith('/[slug]/mentions')
			},
			{
				href: resolve('/[slug]/following', {slug}),
				label: m.nav_following(),
				active: routeId?.startsWith('/[slug]/following')
			},
			{
				href: resolve('/[slug]/followers', {slug}),
				label: m.nav_followers(),
				active: routeId?.startsWith('/[slug]/followers')
			}
		]
	}
</script>

<script>
	/** @type {{items: {href: string, label: string, active?: boolean}[], label?: string, scroll?: boolean}} */
	let {items, label = '', scroll = false} = $props()
</script>

<nav class="section-menu tabs" class:scroll aria-label={label}>
	{#each items as item (item.href)}
		<a href={item.href} class="btn chip" class:active={item.active}>{item.label}</a>
	{/each}
</nav>

<style>
	.section-menu {
		flex-shrink: 0;
	}

	.section-menu.scroll {
		flex-wrap: nowrap;
		width: 100%;
		-webkit-overflow-scrolling: touch;
		padding-bottom: var(--space-1);
	}
</style>
