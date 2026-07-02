<script>
	import {page} from '$app/state'
	import {resolve} from '$app/paths'
	import * as m from '$lib/paraglide/messages'

	let {slug, trackCount = 0} = $props()

	let routeId = $derived(page.route.id)
</script>

<nav class="channel-section-menu tabs" aria-label="Channel navigation">
	<a
		href={resolve('/[slug]/tracks', {slug})}
		class="btn chip"
		class:active={routeId?.startsWith('/[slug]/tracks')}
	>
		{m.nav_tracks()} ({trackCount})
	</a>
	<a
		href={resolve('/[slug]/tags', {slug})}
		class="btn chip"
		class:active={routeId?.startsWith('/[slug]/tags')}
	>
		{m.channel_tags_link()}
	</a>
	<a
		href={resolve('/[slug]/mentions', {slug})}
		class="btn chip"
		class:active={routeId?.startsWith('/[slug]/mentions')}
	>
		Mentions
	</a>
	<a
		href={resolve('/[slug]/following', {slug})}
		class="btn chip"
		class:active={routeId?.startsWith('/[slug]/following')}
	>
		{m.nav_following()}
	</a>
	<a
		href={resolve('/[slug]/followers', {slug})}
		class="btn chip"
		class:active={routeId?.startsWith('/[slug]/followers')}
	>
		{m.nav_followers()}
	</a>
</nav>

<style>
	.channel-section-menu {
		flex-wrap: nowrap;
		width: 100%;
		-webkit-overflow-scrolling: touch;
		padding-bottom: var(--space-1);
	}
</style>
