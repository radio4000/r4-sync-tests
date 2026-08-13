<script>
	import {resolve} from '$app/paths'
	import {sdk} from '@radio4000/sdk'
	import {appState} from '$lib/app-state.svelte'
	import {channelsCollection} from '$lib/collections/channels'
	import {getFeaturedPool} from '$lib/collections/featured'
	import {fetchRecentTracks} from '$lib/collections/tracks'
	import {getFollowedChannels} from '$lib/followed-channels.svelte'
	import {tagsCollection} from '$lib/collections/tags'
	import {useLiveQuery} from '$lib/useLiveQuery.svelte'
	import {searchChannelsCombined} from '$lib/search'
	import {searchTracks} from '$lib/search-fts'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import Icon from '$lib/components/icon.svelte'
	import PopoverMenu from '$lib/components/popover-menu.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import TrackCard from '$lib/components/track-card.svelte'
	import Sheet from './sheet.svelte'
	import {inBag, toggleChannel, toggleTag, toggleSearch} from './bag.svelte.js'

	const follows = getFollowedChannels()
	const isSignedIn = $derived(!!appState.user)
	const userChannel = $derived(appState.channel)
	const userEmail = $derived(appState.user?.email ?? '')

	let featuredPool = $state(/** @type {import('$lib/types').Channel[]} */ ([]))
	let loaded = $state(false)
	let menuOpen = $state(false)
	let searchOpen = $state(false)
	let searchQuery = $state('')
	let searchKind = $state(/** @type {'channels' | 'tracks'} */ ('channels'))
	let channelFilter = $state(/** @type {'featured' | 'all'} */ ('featured'))
	let allChannels = $state(/** @type {import('$lib/types').Channel[]} */ ([]))
	let recentTracks = $state(/** @type {import('$lib/types').Track[]} */ ([]))
	let channelResults = $state(/** @type {import('$lib/types').Channel[]} */ ([]))
	let trackResults = $state(/** @type {import('$lib/types').Track[]} */ ([]))
	let allChannelsLoaded = $state(false)
	let recentTracksLoaded = $state(false)
	let exploreLoading = $state(false)

	const tagsQuery = useLiveQuery((q) => q.from({tags: tagsCollection}))
	const popularTags = $derived(
		(tagsQuery.data ?? [])
			.toSorted((a, b) => b.count - a.count)
			.slice(0, 12)
			.map((t) => t.tag)
	)

	$effect(() => {
		if (loaded) return
		loaded = true
		void getFeaturedPool(30).then((pool) => {
			featuredPool = pool
		})
	})

	const channels = $derived.by(() => {
		const followed = follows.followedChannels
		if (followed.length) {
			const ids = new Set(followed.map((c) => c.id))
			return [...followed, ...featuredPool.filter((c) => !ids.has(c.id))]
		}
		return featuredPool
	})

	const exploreChannels = $derived(
		searchQuery.trim() ? channelResults : channelFilter === 'featured' ? featuredPool : allChannels
	)
	const exploreTracks = $derived(searchQuery.trim() ? trackResults : recentTracks)

	$effect(() => {
		if (!searchOpen) return
		const kind = searchKind
		const query = searchQuery.trim()
		const filter = channelFilter
		let stale = false

		async function loadExplore() {
			if (kind === 'channels') {
				if (query) {
					exploreLoading = true
					const results = await searchChannelsCombined({
						query,
						localChannels: [...channelsCollection.state.values()]
					})
					if (!stale) channelResults = results
				} else if (filter === 'all' && !allChannelsLoaded) {
					exploreLoading = true
					const {data} = await sdk.channels.readChannels(50)
					if (!stale) {
						allChannels = data ?? []
						allChannelsLoaded = true
					}
				}
			} else if (query) {
				exploreLoading = true
				const result = await searchTracks(query, {limit: 50})
				if (!stale) trackResults = result.tracks
			} else if (!recentTracksLoaded) {
				exploreLoading = true
				const results = await fetchRecentTracks({limit: 50})
				if (!stale) {
					recentTracks = results
					recentTracksLoaded = true
				}
			}
		}

		void loadExplore()
			.catch(() => {
				if (!stale) {
					if (kind === 'channels') channelResults = []
					else trackResults = []
				}
			})
			.finally(() => {
				if (!stale) exploreLoading = false
			})

		return () => {
			stale = true
		}
	})

	function closeMenu() {
		menuOpen = false
	}
</script>

<header class="m-bar m-bar-home">
	<button type="button" class="m-ctrl" aria-label="Menu" onclick={() => (menuOpen = true)}>
		{#if userChannel}
			<span class="m-avatar-clip m-burger-avatar">
				<ChannelAvatar id={userChannel.image} alt={userChannel.name} size={64} />
			</span>
		{:else}
			<Icon icon="menu" />
		{/if}
	</button>

	<div class="m-bar-actions">
		<button
			type="button"
			class="m-ctrl"
			aria-label="Search"
			onclick={() => {
				searchOpen = true
				searchQuery = ''
			}}
		>
			<Icon icon="search" />
		</button>

		<PopoverMenu align="right" btnClass="m-ctrl">
			{#snippet trigger()}
				<span aria-label="Add"><Icon icon="add" /></span>
			{/snippet}
			<menu class="nav-vertical">
				<a href={resolve('/add')}><Icon icon="add" /> Add a track</a>
				{#if !userChannel}
					<a href={resolve('/create-channel')}><Icon icon="radio" /> Create a channel</a>
				{/if}
			</menu>
		</PopoverMenu>
	</div>
</header>

{#if searchOpen}
	<section class="m-explore-panel">
		<div class="m-search-row">
			<button
				type="button"
				class="m-ctrl"
				aria-label="Close search"
				onclick={() => {
					searchOpen = false
					searchQuery = ''
				}}
			>
				<Icon icon="close" />
			</button>
			<SearchInput
				bind:value={searchQuery}
				debounce={300}
				placeholder={`Search ${searchKind}`}
				autofocus
				autocomplete="off"
			/>
		</div>
		<menu class="m-explore-chips">
			<button
				class="btn chip"
				class:active={searchKind === 'channels'}
				onclick={() => (searchKind = 'channels')}>Channels</button
			>
			<button
				class="btn chip"
				class:active={searchKind === 'tracks'}
				onclick={() => (searchKind = 'tracks')}>Tracks</button
			>
			<hr />
			{#if searchKind === 'channels'}
				<button
					class="btn chip"
					class:active={channelFilter === 'featured'}
					onclick={() => (channelFilter = 'featured')}>Featured</button
				>
				<button
					class="btn chip"
					class:active={channelFilter === 'all'}
					onclick={() => (channelFilter = 'all')}>All</button
				>
			{:else}
				<button class="btn chip active">Recent</button>
			{/if}
		</menu>
		<menu class="m-explore-chips">
			{#if searchQuery.trim()}
				<button
					class="btn chip m-bag-chip"
					class:active={inBag('search', searchQuery)}
					onclick={() => toggleSearch(searchQuery)}
				>
					+ “{searchQuery.trim()}”
				</button>
			{/if}
			{#each popularTags as tag (tag)}
				<button
					class="btn chip m-bag-chip"
					class:active={inBag('tag', tag)}
					onclick={() => toggleTag(tag)}
				>
					#{tag}
				</button>
			{/each}
		</menu>
	</section>
{/if}

<main class="m-scroll">
	{#if searchOpen}
		{#if exploreLoading}
			<p class="m-empty">Searching…</p>
		{:else if searchKind === 'channels' && exploreChannels.length}
			<ul class="m-list list">
				{#each exploreChannels as channel (channel.id)}
					<li class="m-grab-row">
						<ChannelCard {channel} href={resolve('/m/[slug]', {slug: channel.slug})} />
						<button
							type="button"
							class="m-ctrl m-grab"
							class:added={inBag('channel', channel.slug)}
							aria-label="Add {channel.name} to bag"
							onclick={() => toggleChannel(channel)}
						>
							<Icon icon="add" />
						</button>
					</li>
				{/each}
			</ul>
		{:else if searchKind === 'tracks' && exploreTracks.length}
			<ul class="m-list list">
				{#each exploreTracks as track, index (track.id)}
					<li><TrackCard {track} {index} showSlug /></li>
				{/each}
			</ul>
		{:else}
			<p class="m-empty">No {searchKind} found.</p>
		{/if}
	{:else if !loaded && !channels.length}
		<p class="m-empty">Loading channels…</p>
	{:else if channels.length}
		<ul class="m-list list">
			{#each channels as channel (channel.id)}
				<li class="m-grab-row">
					<ChannelCard {channel} href={resolve('/m/[slug]', {slug: channel.slug})} />
					<button
						type="button"
						class="m-ctrl m-grab"
						class:added={inBag('channel', channel.slug)}
						aria-label="Add {channel.name} to bag"
						onclick={() => toggleChannel(channel)}
					>
						<Icon icon="add" />
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="m-empty">No channels found.</p>
	{/if}
</main>

<Sheet open={menuOpen} title="Menu" onclose={closeMenu}>
	<div class="m-settings">
		{#if userChannel}
			<nav class="nav-vertical">
				<a
					class="m-set-row identity"
					href={resolve('/m/[slug]', {slug: userChannel.slug})}
					onclick={closeMenu}
				>
					<span class="m-avatar-clip m-set-avatar">
						<ChannelAvatar id={userChannel.image} alt={userChannel.name} size={96} />
					</span>
					<span class="m-set-text">
						<span class="m-set-label">{userChannel.name}</span>
						<span class="m-set-sub">@{userChannel.slug}</span>
					</span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			</nav>
		{/if}

		<nav class="nav-vertical">
			{#if isSignedIn}
				<a class="m-set-row" href={resolve('/account')} onclick={closeMenu}>
					<span class="m-set-text">
						<span class="m-set-label">Account</span>
						{#if userEmail}
							<span class="m-set-sub">{userEmail}</span>
						{/if}
					</span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			{:else}
				<a class="m-set-row" href={resolve('/auth')} onclick={closeMenu}>
					<span class="m-set-text"><span class="m-set-label">Sign in</span></span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			{/if}
			<a class="m-set-row" href={resolve('/settings')} onclick={closeMenu}>
				<span class="m-set-text"><span class="m-set-label">Settings</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
		</nav>

		<nav class="nav-vertical">
			<a class="m-set-row" href={resolve('/history')} onclick={closeMenu}>
				<span class="m-set-text"><span class="m-set-label">History</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-set-row" href={resolve('/menu/community')} onclick={closeMenu}>
				<span class="m-set-text"><span class="m-set-label">Community</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-set-row" href={resolve('/about')} onclick={closeMenu}>
				<span class="m-set-text"><span class="m-set-label">About</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
		</nav>
	</div>
</Sheet>

<style>
	.m-bar-home {
		justify-content: space-between;
	}

	.m-bar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.m-burger-avatar {
		width: 2.5rem;
		height: 2.5rem;
		display: block;
	}

	.m-explore-panel {
		display: grid;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-interface);
		border-bottom: 1px solid var(--color-interface-border);
		flex-shrink: 0;
	}

	.m-search-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.m-explore-chips {
		overflow-x: auto;
		flex-wrap: nowrap;
		scrollbar-width: none;
	}

	.m-explore-chips::-webkit-scrollbar {
		display: none;
	}

	.m-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.m-list > .m-grab-row + .m-grab-row {
		border-top: 1px solid var(--color-interface-border);
	}

	.m-settings {
		display: grid;
		gap: var(--space-3);
		padding-top: var(--space-1);
		--border-radius: 4px;
	}

	.m-settings .nav-vertical {
		border-radius: calc(var(--border-radius) * 2.5);
		overflow: hidden;
	}

	.m-set-row {
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.m-set-row.identity {
		min-height: 4rem;
	}

	.m-set-row:has(.m-set-sub) {
		min-height: 3rem;
	}

	.m-set-avatar {
		width: 2.75rem;
		height: 2.75rem;
	}

	.m-set-text {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.m-set-label {
		font-size: var(--font-4);
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.m-set-sub {
		font-size: var(--font-3);
		color: var(--gray-10);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.m-chevron {
		color: var(--gray-8);
		font-size: var(--font-7);
		line-height: 1;
		flex-shrink: 0;
	}
</style>
