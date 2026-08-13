<script>
	import {resolve} from '$app/paths'
	import {sdk} from '@radio4000/sdk'
	import {appState} from '$lib/app-state.svelte'
	import {getFeaturedPool} from '$lib/collections/featured'
	import {getFollowedChannels} from '$lib/followed-channels.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'
	import PopoverMenu from '$lib/components/popover-menu.svelte'
	import ChannelRow from './channel-row.svelte'
	import Sheet from './sheet.svelte'

	const follows = getFollowedChannels()
	const isSignedIn = $derived(!!appState.user)
	const userChannel = $derived(appState.channel)

	let featuredPool = $state(/** @type {import('$lib/types').Channel[]} */ ([]))
	let loaded = $state(false)
	let menuOpen = $state(false)
	let searchOpen = $state(false)
	let searchQuery = $state('')

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

	const filtered = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase()
		if (!q) return channels
		return channels.filter(
			(c) =>
				c.name?.toLowerCase().includes(q) ||
				c.slug?.toLowerCase().includes(q) ||
				c.description?.toLowerCase().includes(q)
		)
	})
</script>

<header class="m-bar">
	<button type="button" class="m-icon-btn" aria-label="Menu" onclick={() => (menuOpen = true)}>
		{#if userChannel}
			<span class="m-avatar-btn">
				<ChannelAvatar id={userChannel.image} alt={userChannel.name} size={64} />
			</span>
		{:else}
			<Icon icon="menu" />
		{/if}
	</button>

	<div class="m-bar-actions">
		<button
			type="button"
			class="m-icon-btn"
			aria-label="Search"
			onclick={() => {
				searchOpen = true
				searchQuery = ''
			}}
		>
			<Icon icon="search" />
		</button>

		<PopoverMenu align="right">
			{#snippet trigger()}
				<span class="m-plus-label" aria-label="Add">
					<Icon icon="add" />
				</span>
			{/snippet}
			<menu class="m-menu">
				<a href={resolve('/add')}>Add a track</a>
				<a href={resolve('/create-channel')}>Create a channel</a>
				<a href={resolve('/explore')}>Explore</a>
			</menu>
		</PopoverMenu>
	</div>
</header>

{#if searchOpen}
	<div class="m-search-bar">
		<button
			type="button"
			class="m-icon-btn"
			aria-label="Close search"
			onclick={() => {
				searchOpen = false
				searchQuery = ''
			}}
		>
			<Icon icon="close" />
		</button>
		<label class="m-search-field">
			<Icon icon="search" />
			<input
				type="search"
				placeholder="Search channels"
				bind:value={searchQuery}
				autocomplete="off"
			/>
		</label>
	</div>
{/if}

<main class="m-scroll">
	{#if !loaded && !channels.length}
		<p class="m-empty">Loading channels…</p>
	{:else if filtered.length}
		<ul class="m-list">
			{#each filtered as channel (channel.id)}
				<li>
					<ChannelRow {channel} />
				</li>
			{/each}
		</ul>
	{:else}
		<p class="m-empty">No channels match.</p>
	{/if}
</main>

<Sheet open={menuOpen} title="Menu" onclose={() => (menuOpen = false)}>
	<menu class="m-menu m-menu-sheet">
		{#if userChannel}
			<a href={resolve(`/${userChannel.slug}`)} onclick={() => (menuOpen = false)}>
				@{userChannel.slug}
			</a>
		{:else if isSignedIn}
			<a href={resolve('/create-channel')} onclick={() => (menuOpen = false)}>Create a channel</a>
		{/if}
		{#if isSignedIn}
			<a href={resolve('/account')} onclick={() => (menuOpen = false)}>Account</a>
			<button
				type="button"
				onclick={() => {
					menuOpen = false
					void sdk.auth.signOut()
				}}
			>
				Log out
			</button>
		{:else}
			<a href={resolve('/auth')} onclick={() => (menuOpen = false)}>Sign in</a>
		{/if}
		<a href={resolve('/settings')} onclick={() => (menuOpen = false)}>Settings</a>
		<a href={resolve('/history')} onclick={() => (menuOpen = false)}>History</a>
		<a href={resolve('/explore')} onclick={() => (menuOpen = false)}>Explore</a>
		<a href={resolve('/stats')} onclick={() => (menuOpen = false)}>Stats</a>
		<a href={resolve('/apps')} onclick={() => (menuOpen = false)}>Apps</a>
		<a href={resolve('/about')} onclick={() => (menuOpen = false)}>About</a>
		<a href={resolve('/')} onclick={() => (menuOpen = false)}>Main Radio4000</a>
	</menu>
</Sheet>

<style>
	.m-bar,
	.m-search-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-3);
		background: var(--color-interface);
		border-bottom: 1px solid var(--color-interface-border);
		flex-shrink: 0;
	}

	.m-search-bar {
		justify-content: flex-start;
	}

	.m-bar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.m-icon-btn {
		width: 2.5rem;
		height: 2.5rem;
		min-width: 2.5rem;
		min-height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-12);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.m-bar-actions :global(.popover-menu > button) {
		width: 2.5rem;
		height: 2.5rem;
		min-width: 2.5rem;
		min-height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-12);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.m-avatar-btn {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		overflow: hidden;
		display: block;
	}

	.m-avatar-btn :global(img),
	.m-avatar-btn :global(.fallback) {
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
	}

	.m-plus-label {
		display: inline-flex;
	}

	.m-search-field {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-height: 2.5rem;
		padding: 0 var(--space-2);
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-10);
	}

	.m-search-field input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		color: var(--gray-12);
		font: inherit;
		font-size: var(--font-4);
		outline: none;
	}

	.m-scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
		background: var(--color-interface);
	}

	.m-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.m-empty {
		margin: var(--space-3);
		color: var(--gray-10);
		font-size: var(--font-4);
	}

	.m-menu {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.m-menu a,
	.m-menu button {
		display: flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 var(--space-2);
		border: 0;
		border-radius: var(--border-radius);
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: var(--font-4);
		text-align: start;
		text-decoration: none;
		cursor: pointer;
	}

	.m-menu a + a,
	.m-menu a + button,
	.m-menu button + a {
		border-top: 1px solid var(--color-interface-border);
	}

	.m-menu-sheet {
		margin: calc(var(--space-2) * -1);
	}

	.m-menu-sheet a,
	.m-menu-sheet button {
		min-height: 3rem;
		padding-inline: var(--space-3);
		border-radius: 0;
	}
</style>
