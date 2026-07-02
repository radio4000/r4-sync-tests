<script>
	import {goto} from '$app/navigation'
	import {resolve} from '$app/paths'
	import {page} from '$app/state'
	import {getChannelCtx} from '$lib/contexts'
	import {appState} from '$lib/app-state.svelte'
	import {getChannelConnections, getFollowedChannels} from '$lib/followed-channels.svelte'
	import ChannelsView from '$lib/components/channels-view.svelte'
	import ChannelsViewControls from '$lib/components/channels-view-controls.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import Subpage from '$lib/components/subpage.svelte'
	import ChannelNavControlsPortal from '$lib/components/channel-nav-controls-portal.svelte'
	import Seo from '$lib/components/seo.svelte'
	import * as m from '$lib/paraglide/messages'

	const d = appState.channels_display
	let display = $state(d === 'grid' || d === 'list' || d === 'map' || d === 'infinite' ? d : 'grid')
	const o = appState.channels_order
	let order = $state(
		o === 'updated' || o === 'created' || o === 'name' || o === 'tracks' ? o : 'updated'
	)
	/** @type {'asc' | 'desc'} */
	let direction = $state(appState.channels_order_direction || 'desc')

	$effect(() => {
		appState.channels_display = display
		appState.channels_order = order
		appState.channels_order_direction = direction
	})

	const channelCtx = getChannelCtx()
	let channel = $derived(channelCtx.data)
	const follows = getFollowedChannels()

	let q = $state('')
	// Only the intersection with own follows is shown — ids suffice, channel
	// objects come from the already-loaded followed channels.
	const conn = getChannelConnections('followers', () => channel?.id, {hydrate: false})
	let loading = $derived(conn.loading || follows.isLoading)

	const matches = (/** @type {any} */ c, /** @type {string} */ q) =>
		!q ||
		c.name?.toLowerCase().includes(q.toLowerCase()) ||
		c.slug?.toLowerCase().includes(q.toLowerCase())

	let followerIdSet = $derived(new Set(conn.ids))
	let commonFollowers = $derived(follows.followedChannels.filter((c) => followerIdSet.has(c.id)))
	let filteredChannels = $derived(commonFollowers.filter((c) => matches(c, q)))

	function onViewChange(next) {
		if (next !== 'all') return
		goto(resolve('/[slug]/followers', {slug: page.params.slug ?? ''}))
	}
</script>

<ChannelNavControlsPortal controls={navControls} />

{#snippet navControls()}
	<select
		value="in-common"
		aria-label={m.nav_followers()}
		onchange={(e) => onViewChange(e.currentTarget.value)}
	>
		<option value="all">{m.views_tags_all()}</option>
		<option value="in-common">{m.nav_in_common()}</option>
	</select>
	{#if commonFollowers.length}
		<SearchInput
			bind:value={q}
			placeholder={m.followers_search_placeholder({count: commonFollowers.length})}
		/>
		<ChannelsViewControls bind:display bind:order bind:direction />
	{/if}
{/snippet}

<Seo title={`${m.nav_in_common()} - ${channel?.name || m.channel_page_fallback()}`} plain />

<article class="channels-page fill-height">
	<Subpage
		title={m.nav_in_common()}
		{loading}
		empty={commonFollowers.length === 0}
		emptyText={m.in_common_empty()}
	>
		<ChannelsView
			channels={filteredChannels}
			bind:display
			bind:order
			bind:direction
			showToolbar={false}
		/>
	</Subpage>
</article>

<style>
	.channels-page {
		flex-direction: column;
	}

	.channels-page :global(.layout--map) {
		min-height: 100%;
	}
</style>
