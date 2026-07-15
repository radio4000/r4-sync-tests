<script>
	import {page} from '$app/state'
	import {resolve} from '$app/paths'
	import {onMount} from 'svelte'
	import {MediaQuery} from 'svelte/reactivity'
	import {appState} from '$lib/app-state.svelte'
	import {isBroadcasting as isBroadcastingDeck, sortedDeckIds} from '$lib/deck'
	import AddTrackDialog from '$lib/components/track-add-dialog.svelte'
	import BroadcastToggle from '$lib/components/broadcast-toggle.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'
	import NavPopover from '$lib/components/nav-popover.svelte'
	import IconR4 from '$lib/components/icon-r4.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.svelte.js'
	import InternetIndicator from '$lib/components/internet-indicator.svelte'
	import * as m from '$lib/paraglide/messages'
	import {appName, conceptIcons, MOBILE_BREAKPOINT, navPopoverOnLogo} from '$lib/config'
	import {deckAccent} from '$lib/app-state.svelte'

	const {preloading} = $props()

	const isSignedIn = $derived(!!appState.user)
	const userChannel = $derived(appState.channel)
	const isBroadcasting = $derived(isBroadcastingDeck(appState.decks, userChannel?.id))
	const deckIds = $derived(sortedDeckIds(appState.decks))
	const activeDeckColor = $derived(deckAccent(deckIds, appState.active_deck_id))

	const DESKTOP_MIN = 1
	const DESKTOP_MAX = 10000
	const DESKTOP_DEFAULT = 188
	const MOBILE_MIN = 52
	const MOBILE_MAX = 120
	const MOBILE_DEFAULT = 100
	const STORAGE_KEY_LABELS_VISIBLE = 'r5:layout-header-labels-visible'

	const mobileViewport = new MediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`)

	let headerSize = $state(DESKTOP_DEFAULT)
	let labelsVisible = $state(true)
	let labelLayout = $state(/** @type {'none' | 'right' | 'below'} */ ('none'))

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value))
	}

	function sizeBounds(mobile) {
		return mobile ? [MOBILE_MIN, MOBILE_MAX] : [DESKTOP_MIN, DESKTOP_MAX]
	}

	function applyModeFromSize() {
		if (!labelsVisible) labelLayout = 'none'
		else labelLayout = mobileViewport.current ? 'below' : 'right'
	}

	function loadSizeForViewport(mobile) {
		const [min, max] = sizeBounds(mobile)
		const fallback = mobile ? MOBILE_DEFAULT : DESKTOP_DEFAULT
		headerSize = clamp(fallback, min, max)
		applyModeFromSize()
	}

	function persistLabelsVisible() {
		if (typeof localStorage === 'undefined') return
		localStorage.setItem(STORAGE_KEY_LABELS_VISIBLE, labelsVisible ? '1' : '0')
	}

	function toggleLabels(event) {
		// Only on the header background — not links/buttons (fast double-taps)
		if (event.target.closest('a, button, input, [popover]')) return
		labelsVisible = !labelsVisible
		applyModeFromSize()
		persistLabelsVisible()
	}

	onMount(() => {
		const stored =
			typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LABELS_VISIBLE) : null
		labelsVisible = stored == null ? true : stored === '1'
		applyModeFromSize()
	})

	$effect(() => {
		loadSizeForViewport(mobileViewport.current)
	})
</script>

<header
	class:labels-none={labelLayout === 'none'}
	class:labels-right={labelLayout === 'right'}
	class:labels-below={labelLayout === 'below'}
	class:mobile={mobileViewport.current}
	style={`--app-header-size:${headerSize}px;`}
	ondblclick={toggleLabels}
>
	<nav class="nav-secondary">
		<div
			class="home-link"
			style:color={activeDeckColor}
			aria-label={appName}
			{@attach tooltip({content: appName})}
		>
			{#if navPopoverOnLogo}
				<NavPopover />
			{:else}
				<a href={resolve('/')} class="btn nav-btn">
					<IconR4 size={18} />
					<span class="btn-label">{appName}</span>
				</a>
			{/if}
		</div>
		<a
			href={resolve('/explore')}
			class="btn nav-btn"
			class:active={page.route.id?.startsWith('/explore') ||
				page.route.id?.startsWith('/channels') ||
				page.route.id?.startsWith('/tracks') ||
				page.route.id?.startsWith('/tags') ||
				page.route.id?.startsWith('/feed')}
			aria-label={m.nav_explore()}
			{@attach tooltip({content: m.nav_explore()})}
		>
			<Icon icon={conceptIcons.channels} />
			<span class="btn-label">{m.nav_explore()}</span>
		</a>
	</nav>

	<!-- <nav class="pins">
		<PinsNav />
	</nav> -->

	<nav class="user-nav">
		{#await preloading then}
			{#if userChannel}
				<AddTrackDialog class="nav-btn" label="Add" />
				<a
					href={resolve(`/${userChannel.slug}`)}
					class={[
						'btn',
						'nav-btn',
						'channel-link',
						{broadcasting: isBroadcasting, active: page.params?.slug === userChannel.slug}
					]}
					{@attach tooltip({
						content: isBroadcasting ? m.status_broadcasting() : m.header_go_to_channel()
					})}
				>
					<ChannelAvatar id={userChannel.image} alt={userChannel.name} />
					{#if isBroadcasting}<span class="broadcast-dot"></span>{/if}
					<span class="btn-label channel-slug-label">@{userChannel.slug}</span>
				</a>
				<BroadcastToggle channel={userChannel} class="nav-btn" />
			{:else if isSignedIn}
				<a
					href={resolve('/create-channel')}
					class="btn nav-btn"
					class:active={page.route.id?.startsWith('/create-channel')}
					aria-label={m.nav_channels()}
					{@attach tooltip({content: m.nav_channels()})}
				>
					<Icon icon="user" />
					<span class="btn-label">{m.nav_channels()}</span>
				</a>
			{/if}
			{#if !isSignedIn}
				<a
					href={resolve('/auth')}
					class="btn nav-btn"
					class:active={page.route.id?.startsWith('/auth')}
					aria-label={m.nav_sign_in()}
					{@attach tooltip({content: m.nav_sign_in()})}
				>
					<Icon icon="user" />
					<span class="btn-label">{m.nav_sign_in()}</span>
				</a>
			{/if}
		{/await}
	</nav>

	<nav class="nav-settings">
		<a
			href={resolve('/menu')}
			class="btn settings-link nav-btn"
			class:active={page.route.id?.startsWith('/menu') || page.route.id?.startsWith('/settings')}
			aria-label="Menu"
			{@attach tooltip({content: 'Menu'})}
		>
			<Icon icon="menu" />
			<span class="btn-label">Menu</span>
		</a>
		<InternetIndicator href={resolve('/import')} />
	</nav>
</header>

<style>
	header {
		--app-nav-btn-size: clamp(2rem, calc(var(--app-header-size) * 0.3), 3.5rem);
		--app-nav-glyph-size: clamp(1.3rem, calc(var(--app-nav-btn-size) * 0.5), 1.5rem);
		--app-nav-gap: 0.4rem;
		--app-nav-pad-inline: clamp(0.5rem, calc(var(--app-nav-btn-size) * 0.2), 0.62rem);
		--app-nav-pad-block: clamp(0rem, calc(var(--app-nav-btn-size) * 0.06), 0.2rem);
		display: flex;
		flex-flow: column nowrap;
		gap: clamp(var(--space-1), calc(var(--app-nav-btn-size) * 0.2), 0.8rem);
		padding: var(--space-2) var(--space-1);
		inline-size: clamp(min-content, var(--app-header-size), max-content);
		min-inline-size: min-content;
		max-inline-size: max-content;
		background: var(--color-interface);
		border-right: 1px solid var(--color-interface-border);
		z-index: 50;
		position: relative;
		overflow: visible;
	}

	nav {
		flex-direction: column;
		margin: 0;

		@media (min-width: 768px) {
			/* vertical version has more space */
			gap: var(--space-1);
		}
	}

	nav :global(.btn svg) {
		color: currentColor;
	}

	.nav-secondary {
		justify-content: flex-start;
	}

	.home-link:not(.nav-btn) {
		padding: 0;
	}

	nav :global(.btn.nav-btn) {
		min-width: var(--app-nav-btn-size);
		height: auto;
		width: auto;
		padding: var(--app-nav-pad-block) var(--app-nav-pad-inline);
		gap: var(--app-nav-gap);
		border-color: transparent;
		background: transparent;
		transition:
			min-width 120ms ease,
			min-height 120ms ease,
			padding 120ms ease;
	}

	nav :global(.broadcast-toggle.nav-btn) {
		background: var(--button-bg);
		border-color: var(--color-control-border);
	}

	nav :global(.broadcast-toggle.nav-btn:hover),
	nav :global(.broadcast-toggle.nav-btn:focus) {
		background: var(--gray-4);
		border-color: var(--color-control-border-hover);
	}

	nav :global(.btn.nav-btn .btn-label) {
		display: block;
		font-size: var(--font-3);
		max-width: 10ch;
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-nav {
		margin-top: auto;
		margin-bottom: auto;
	}

	.broadcast-dot {
		position: absolute;
		top: -7px;
		right: -5px;
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 50%;
		background: var(--accent-9);
	}

	.btn:has(.broadcast-dot) {
		position: relative;
	}

	.channel-link {
		padding: var(--space-1);
		overflow: hidden;
		flex-shrink: 0;

		:global(img, .fallback) {
			flex: none;
		}

		:global(img, .fallback, svg) {
			width: 100%;
			height: 100%;
			border-radius: calc(var(--border-radius) - 0.2rem);
			object-fit: cover;
		}
	}

	nav :global(.btn.nav-btn svg) {
		width: var(--app-nav-glyph-size);
		height: var(--app-nav-glyph-size);
	}

	.channel-link:not(.nav-btn) {
		width: 2rem;
		height: 2rem;
	}

	.channel-link.nav-btn {
		padding: var(--space-1) var(--space-2) var(--space-1);
		--channel-avatar-size: var(--app-nav-glyph-size);

		:global(img, .fallback, svg) {
			width: var(--channel-avatar-size);
			height: var(--channel-avatar-size);
			min-width: var(--channel-avatar-size);
			min-height: var(--channel-avatar-size);
			aspect-ratio: 1;
		}
	}

	.channel-slug-label {
		max-width: 8ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	header.labels-none :global(.btn.nav-btn .btn-label) {
		display: none;
	}

	header.labels-below :global(.btn.nav-btn) {
		flex-direction: column;
	}

	header.labels-right :global(.btn.nav-btn) {
		flex-direction: row;
		justify-content: flex-start;
		min-width: min(100%, calc(var(--app-header-size) - 0.5rem));
	}

	header.labels-right nav :global(.btn.nav-btn .btn-label) {
		text-align: left;
		max-width: none;
	}

	/* Active menu item: no accent color, only interface background */
	nav :global(.btn.active) {
		color: inherit;
		background: var(--color-interface-elevated);
		border-color: transparent;
		box-shadow: none;
	}

	nav :global(.btn.active svg) {
		color: var(--accent-9);
	}

	@media (max-width: 768px) {
		nav :global(.btn.nav-btn) {
			min-height: var(--app-nav-btn-size);
		}

		nav :global(.btn.nav-btn .btn-label) {
			font-size: var(--font-1);
			letter-spacing: normal;
		}

		header {
			--app-nav-btn-size: calc(var(--app-header-size) * 0.4);
			--app-nav-gap: var(--space-1);
			--app-nav-pad-inline: var(--space-1);
			align-items: center;
			flex-direction: row;
			justify-content: space-between;
			gap: 0.5rem;
			padding: var(--space-1) 0.5rem var(--space-2);
			inline-size: 100%;
			width: 100%;
			min-inline-size: 100%;
			min-width: 100%;
			max-inline-size: none;
			block-size: auto;
			min-block-size: auto;
			max-block-size: none;
			box-sizing: border-box;
			border: none;
			border-top: 1px solid var(--color-interface-border);
			border-radius: 0;
		}

		nav:first-of-type {
			flex: 0 0 auto;
			justify-content: flex-start;
		}

		.nav-settings {
			flex: 0 0 auto;
			justify-content: flex-end;
		}

		nav {
			flex-direction: row;
			flex: 0 0 auto;
			justify-content: flex-start;
			gap: var(--space-1);
		}

		.user-nav {
			flex: 1;
			justify-content: center;
		}

		/* Active menu item keeps same style on mobile */
		nav :global(.btn.active) {
			color: inherit;
			background: var(--color-interface-elevated);
			border-color: transparent;
			box-shadow: none;
		}
	}

	/* Tightest phones: drop labels in the crowded user-nav */
	@media (max-width: 520px) {
		.user-nav :global(.btn.nav-btn .btn-label) {
			display: none;
		}
	}
</style>
