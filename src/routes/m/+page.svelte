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
	const userEmail = $derived(appState.user?.email ?? '')

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
			<menu class="m-plus-menu">
				<a href={resolve('/add')}>Add a track</a>
				<a href={resolve('/create-channel')}>Create a channel</a>
				<a href={resolve('/explore')}>Explore</a>
			</menu>
		</PopoverMenu>
	</div>
</header>

{#if searchOpen}
	<div class="m-bar m-search-bar">
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

<Sheet open={menuOpen} title="Menu" onclose={closeMenu}>
	<div class="m-settings">
		<section class="m-card">
			{#if userChannel}
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
			{:else if isSignedIn}
				<a class="m-set-row" href={resolve('/create-channel')} onclick={closeMenu}>
					<span class="m-set-text"><span class="m-set-label">Create a channel</span></span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			{/if}

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
				<button
					type="button"
					class="m-set-row"
					onclick={() => {
						closeMenu()
						void sdk.auth.signOut()
					}}
				>
					<span class="m-set-text"><span class="m-set-label">Log out</span></span>
				</button>
			{:else}
				<a class="m-set-row" href={resolve('/auth')} onclick={closeMenu}>
					<span class="m-set-text"><span class="m-set-label">Sign in</span></span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			{/if}
		</section>

		<section class="m-card">
			<a class="m-set-row" href={resolve('/settings')} onclick={closeMenu}>
				<span class="m-set-text"><span class="m-set-label">Settings</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-set-row" href={resolve('/history')} onclick={closeMenu}>
				<span class="m-set-text"><span class="m-set-label">History</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-set-row" href={resolve('/explore')} onclick={closeMenu}>
				<span class="m-set-text"><span class="m-set-label">Explore</span></span>
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
		</section>
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

	.m-search-bar {
		justify-content: flex-start;
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

	.m-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.m-plus-menu {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.m-plus-menu a {
		display: flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 var(--space-2);
		color: inherit;
		font: inherit;
		font-size: var(--font-4);
		text-decoration: none;
	}

	.m-plus-menu a + a {
		border-top: 1px solid var(--color-interface-border);
	}

	.m-settings {
		display: grid;
		gap: var(--space-3);
		padding-top: var(--space-1);
	}

	.m-card {
		margin: 0;
		padding: 0;
		background: var(--color-interface-elevated);
		border: 1px solid var(--color-interface-border);
		border-radius: calc(var(--border-radius) * 2.5);
		overflow: hidden;
	}

	.m-set-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		min-height: 3.25rem;
		padding: var(--space-2) var(--space-3);
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: start;
		text-decoration: none;
		cursor: pointer;
	}

	.m-set-row.identity {
		min-height: 4rem;
	}

	.m-set-row + .m-set-row::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		left: var(--space-3);
		border-top: 1px solid var(--color-interface-border);
	}

	.m-set-row.identity + .m-set-row::before {
		left: calc(2.75rem + var(--space-3) + var(--space-2));
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
