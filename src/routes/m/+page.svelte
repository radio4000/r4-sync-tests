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
			<menu class="m-plus-menu">
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

<Sheet open={menuOpen} title="Menu" onclose={closeMenu}>
	<div class="m-settings">
		<section class="m-card">
			{#if userChannel}
				<a class="m-row identity" href={resolve('/m/[slug]', {slug: userChannel.slug})} onclick={closeMenu}>
					<span class="m-row-avatar">
						<ChannelAvatar id={userChannel.image} alt={userChannel.name} size={96} />
					</span>
					<span class="m-row-text">
						<span class="m-row-label">{userChannel.name}</span>
						<span class="m-row-sub">@{userChannel.slug}</span>
					</span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			{:else if isSignedIn}
				<a class="m-row" href={resolve('/create-channel')} onclick={closeMenu}>
					<span class="m-row-text">
						<span class="m-row-label">Create a channel</span>
					</span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			{/if}

			{#if isSignedIn}
				<a class="m-row" href={resolve('/account')} onclick={closeMenu}>
					<span class="m-row-text">
						<span class="m-row-label">Account</span>
						{#if userEmail}
							<span class="m-row-sub">{userEmail}</span>
						{/if}
					</span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
				<button
					type="button"
					class="m-row"
					onclick={() => {
						closeMenu()
						void sdk.auth.signOut()
					}}
				>
					<span class="m-row-text">
						<span class="m-row-label">Log out</span>
					</span>
				</button>
			{:else}
				<a class="m-row" href={resolve('/auth')} onclick={closeMenu}>
					<span class="m-row-text">
						<span class="m-row-label">Sign in</span>
					</span>
					<span class="m-chevron" aria-hidden="true">›</span>
				</a>
			{/if}
		</section>

		<section class="m-card">
			<a class="m-row" href={resolve('/settings')} onclick={closeMenu}>
				<span class="m-row-text"><span class="m-row-label">Settings</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-row" href={resolve('/history')} onclick={closeMenu}>
				<span class="m-row-text"><span class="m-row-label">History</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-row" href={resolve('/explore')} onclick={closeMenu}>
				<span class="m-row-text"><span class="m-row-label">Explore</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-row" href={resolve('/menu/community')} onclick={closeMenu}>
				<span class="m-row-text"><span class="m-row-label">Community</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
			<a class="m-row" href={resolve('/about')} onclick={closeMenu}>
				<span class="m-row-text"><span class="m-row-label">About</span></span>
				<span class="m-chevron" aria-hidden="true">›</span>
			</a>
		</section>
	</div>
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
		border: 0;
		border-radius: var(--border-radius);
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: var(--font-4);
		text-decoration: none;
	}

	.m-plus-menu a + a {
		border-top: 1px solid var(--color-interface-border);
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

	.m-settings {
		display: grid;
		gap: var(--space-3);
		padding-top: var(--space-1);
	}

	.m-card {
		margin: 0;
		padding: 0;
		list-style: none;
		background: var(--color-interface-elevated);
		border: 1px solid var(--color-interface-border);
		border-radius: calc(var(--border-radius) * 2.5);
		overflow: hidden;
	}

	.m-row {
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

	.m-row.identity {
		min-height: 4rem;
	}

	.m-row + .m-row::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		left: var(--space-3);
		border-top: 1px solid var(--color-interface-border);
	}

	.m-row.identity + .m-row::before {
		left: calc(2.75rem + var(--space-3) + var(--space-2));
	}

	.m-row-avatar {
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 999px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--gray-3);
	}

	.m-row-avatar :global(img),
	.m-row-avatar :global(.fallback) {
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
	}

	.m-row-text {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.m-row-label {
		font-size: var(--font-4);
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.m-row-sub {
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
