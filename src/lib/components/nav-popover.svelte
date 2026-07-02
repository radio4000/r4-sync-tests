<script>
	/**
	 * NavPopover — a single brand+chevron trigger that opens a command-palette
	 * style panel gathering the global actions (Home, Explore, Add, Broadcast),
	 * a jump-to-channel search, and channel shortlists.
	 *
	 * Exploratory: rendered alongside the existing sidebar for side-by-side
	 * comparison. See docs discussion on "simpler Radio4000".
	 *
	 * TODO: "Recently visited" has no data source yet — we seed it from followed
	 * channels (recent-activity order). A real recents list needs a
	 * `channel:visited` capture event (see src/lib/collections/capture-events.ts).
	 */
	import {resolve} from '$app/paths'
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import PopoverMenu from '$lib/components/popover-menu.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import Icon from '$lib/components/icon.svelte'
	import IconR4 from '$lib/components/icon-r4.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import BroadcastToggle from '$lib/components/broadcast-toggle.svelte'
	import {getFollowedChannels} from '$lib/followed-channels.svelte'
	import {searchChannelsCombined} from '$lib/search'
	import {conceptIcons} from '$lib/config'
	import * as m from '$lib/paraglide/messages'

	const isSignedIn = $derived(!!appState.user)
	const userChannel = $derived(appState.channel)
	const ownChannels = $derived(userChannel ? [userChannel] : [])
	const contextSlug = $derived(page.params?.slug)

	const followed = getFollowedChannels()
	const recentChannels = $derived(followed.followedChannels.slice(0, 6))

	let query = $state('')
	let results = $state(/** @type {import('$lib/types').Channel[]} */ ([]))
	let searching = $state(false)

	// Debounced channel jump-search (slug + FTS + local fuzzy)
	$effect(() => {
		const q = query.trim()
		if (!q) {
			results = []
			searching = false
			return
		}
		searching = true
		let stale = false
		searchChannelsCombined({query: q, localChannels: appState.local_channels ?? []})
			.then((r) => {
				if (stale) return
				results = r.slice(0, 12)
				searching = false
			})
			.catch(() => {
				if (stale) return
				results = []
				searching = false
			})
		return () => {
			stale = true
		}
	})

	function openAddTrack() {
		appState.modal_track_add = {}
	}
</script>

<PopoverMenu align="left" valign="bottom" btnClass="nav-brand-trigger">
	{#snippet trigger()}
		<IconR4 />
		{#if contextSlug}<span class="brand-context">@{contextSlug}</span>{/if}
		<Icon icon="arrow-down" size={13} />
	{/snippet}

	<div class="nav-palette">
			<nav class="tiles">
				<a class="tile" href={resolve('/')}>
					<Icon icon={conceptIcons.home} size={22} />
					<span>Home</span>
				</a>
				<a class="tile" href={resolve('/explore')}>
					<Icon icon={conceptIcons.channels} size={22} />
					<span>{m.nav_explore()}</span>
				</a>
				{#if userChannel}
					<button class="tile" type="button" onclick={openAddTrack}>
						<Icon icon="add" size={22} />
						<span>{m.track_add_title()}</span>
					</button>
					<BroadcastToggle channel={userChannel} class="tile" />
				{:else if isSignedIn}
					<a class="tile" href={resolve('/create-channel')}>
						<Icon icon="user" size={22} />
						<span>{m.nav_channels()}</span>
					</a>
				{:else}
					<a class="tile" href={resolve('/auth')}>
						<Icon icon="user" size={22} />
						<span>{m.nav_sign_in()}</span>
					</a>
				{/if}
			</nav>

			<!-- stopPropagation so the input's clear button doesn't close the popover -->
			<div class="palette-search" role="search" onclick={(e) => e.stopPropagation()}>
				<SearchInput
					bind:value={query}
					debounce={200}
					placeholder="Search or jump to a channel…"
					autofocus
				/>
			</div>

			{#if query.trim()}
				<section class="palette-list">
					<h4>Channels</h4>
					{#if searching && !results.length}
						<p class="palette-hint">Searching…</p>
					{:else if results.length}
						{#each results as channel (channel.id)}
							{@render channelRow(channel)}
						{/each}
					{:else}
						<p class="palette-hint">No channels for “{query.trim()}”</p>
					{/if}
				</section>
			{:else}
				{#if ownChannels.length}
					<section class="palette-list">
						<h4>Your channels</h4>
						{#each ownChannels as channel (channel.id)}
							{@render channelRow(channel)}
						{/each}
					</section>
				{/if}
				{#if recentChannels.length}
					<section class="palette-list">
						<h4>Following</h4>
						{#each recentChannels as channel (channel.id)}
							{@render channelRow(channel)}
						{/each}
					</section>
				{/if}
			{/if}

			<footer class="palette-footer">
				<a href={resolve('/menu')}>
					<Icon icon="menu" size={16} />
					<span>Menu</span>
				</a>
			</footer>
		</div>
</PopoverMenu>

{#snippet channelRow(channel)}
	<a class="channel-row" href={resolve(`/${channel.slug}`)}>
		<ChannelAvatar id={channel.image} alt={channel.name} />
		<span class="channel-meta">
			<span class="channel-name">{channel.name}</span>
			<span class="channel-slug">@{channel.slug}</span>
		</span>
	</a>
{/snippet}

<style>
	:global(.nav-brand-trigger) {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--border-radius);
		color: inherit;
		font-weight: 600;
		cursor: var(--interactive-cursor, pointer);
	}

	:global(.nav-brand-trigger:hover) {
		background: var(--color-interface-elevated);
	}

	.brand-context {
		font-weight: 400;
		white-space: nowrap;
		color: var(--color-text-2);
	}

	.nav-palette {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: min(21rem, calc(100vw - 2rem));
		max-height: min(34rem, calc(100vh - 5rem));
		overflow-y: auto;
	}

	.tiles {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-1);
		margin: 0;
		padding: 0;
	}

	.tiles :global(.tile) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		height: auto;
		padding: var(--space-2) var(--space-1);
		background: var(--color-interface);
		border: 1px solid var(--color-interface-border);
		border-radius: var(--border-radius);
		color: inherit;
		font-size: var(--font-2);
		text-align: center;
	}

	.tiles :global(.tile:hover) {
		background: var(--color-interface-elevated);
	}

	.tiles :global(.tile span),
	.tiles :global(.tile .btn-label) {
		display: block;
		font-size: var(--font-2);
		line-height: 1.1;
	}

	.tiles :global(.tile.broadcasting) {
		color: var(--accent-9);
	}

	.palette-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.palette-list h4 {
		margin: 0 0 var(--space-1);
		padding-inline: var(--space-1);
		font-size: var(--font-1);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-2);
	}

	.palette-hint {
		margin: 0;
		padding: var(--space-1);
		color: var(--color-text-2);
		font-size: var(--font-2);
	}

	.channel-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1);
		border-radius: var(--border-radius);
		color: inherit;
	}

	.channel-row:hover {
		background: var(--color-interface-elevated);
	}

	.channel-row :global(img),
	.channel-row :global(.fallback) {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: calc(var(--border-radius) - 0.2rem);
		object-fit: cover;
		flex: none;
	}

	.channel-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.channel-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.channel-slug {
		font-size: var(--font-1);
		color: var(--color-text-2);
	}

	.palette-footer {
		border-top: 1px solid var(--color-interface-border);
		padding-top: var(--space-2);
	}

	.palette-footer a {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1);
		border-radius: var(--border-radius);
		color: inherit;
	}

	.palette-footer a:hover {
		background: var(--color-interface-elevated);
	}
</style>
