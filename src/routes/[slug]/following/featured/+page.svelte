<script>
	import {goto} from '$app/navigation'
	import {resolve} from '$app/paths'
	import {page} from '$app/state'
	import {getChannelCtx} from '$lib/contexts'
	import {appState} from '$lib/app-state.svelte'
	import {getChannelConnections, getFollowedChannels} from '$lib/followed-channels.svelte'
	import {dedupeById, extractMentions} from '$lib/utils'
	import {findChannelBySlug} from '$lib/search'
	import ChannelsView from '$lib/components/channels-view.svelte'
	import ChannelsViewControls from '$lib/components/channels-view-controls.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import Subpage from '$lib/components/subpage.svelte'
	import ChannelNavControlsPortal from '$lib/components/channel-nav-controls-portal.svelte'
	import Seo from '$lib/components/seo.svelte'
	import * as m from '$lib/paraglide/messages'

	const FEATURED_LIMIT = 10

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
	// Following ids only — used for the in-common count, no channel objects needed.
	const conn = getChannelConnections('following', () => channel?.id, {hydrate: false})
	let loading = $derived(conn.loading)
	let featuredChannels = $state([])
	let featuredLoading = $state(false)

	const matches = (/** @type {any} */ c, /** @type {string} */ query) =>
		!query ||
		c.name?.toLowerCase().includes(query.toLowerCase()) ||
		c.slug?.toLowerCase().includes(query.toLowerCase())

	let featuredMentions = $derived(
		extractMentions(channel?.description ?? '')
			.map((slug) => slug.slice(1))
			.slice(0, FEATURED_LIMIT)
	)
	let filteredChannels = $derived(featuredChannels.filter((c) => matches(c, q)))
	let hasFeatured = $derived(featuredChannels.length > 0)
	let commonIds = $derived(new Set(follows.followedIds))
	let isOtherChannel = $derived(
		Boolean(
			appState.user && appState.channel?.id && channel?.id && appState.channel.id !== channel.id
		)
	)
	let commonFollowingCount = $derived(conn.ids.filter((id) => commonIds.has(id)).length)
	let showInCommon = $derived(isOtherChannel && commonFollowingCount > 0)

	function followingBasePath() {
		return resolve('/[slug]/following', {slug: page.params.slug ?? ''})
	}

	function onViewChange(next) {
		const base = followingBasePath()
		if (next === 'featured') {
			goto(`${base}/featured`)
			return
		}
		if (next === 'in-common') {
			goto(`${base}/in-common`)
			return
		}
		goto(base)
	}

	$effect(() => {
		if (!channel?.id) return
		q = ''
	})

	$effect(() => {
		const slugs = featuredMentions
		if (!slugs.length) {
			featuredChannels = []
			featuredLoading = false
			return
		}

		featuredLoading = true
		let stale = false
		Promise.all(slugs.map(findChannelBySlug))
			.then((results) => {
				if (stale) return
				featuredChannels = dedupeById(results.filter((c) => c !== undefined))
				featuredLoading = false
			})
			.catch(() => {
				if (stale) return
				featuredChannels = []
				featuredLoading = false
			})

		return () => {
			stale = true
		}
	})

	$effect(() => {
		if (!channel?.id || featuredLoading) return
		if (!hasFeatured) goto(followingBasePath(), {replaceState: true})
	})
</script>

<ChannelNavControlsPortal controls={navControls} />

{#snippet navControls()}
	<select
		value="featured"
		aria-label={m.nav_following()}
		onchange={(e) => onViewChange(e.currentTarget.value)}
	>
		{#if hasFeatured}
			<option value="featured">{m.channel_section_featured_channels()}</option>
		{/if}
		<option value="all">{m.views_tags_all()}</option>
		{#if showInCommon}
			<option value="in-common">{m.nav_in_common()}</option>
		{/if}
	</select>
	<SearchInput
		bind:value={q}
		placeholder={m.following_search_placeholder({count: featuredChannels.length})}
	/>
	<ChannelsViewControls bind:display bind:order bind:direction />
{/snippet}

<Seo title={`${m.channel_section_featured_channels()} - ${channel?.name || m.channel_page_fallback()}`} plain />

<article class="channels-page fill-height">
	<Subpage
		title={m.channel_section_featured_channels()}
		loading={loading || featuredLoading}
		empty={!featuredLoading && featuredChannels.length === 0}
		emptyText={m.following_empty()}
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
