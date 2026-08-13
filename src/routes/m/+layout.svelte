<script>
	/**
	 * Throwaway mobile-native prototype shell.
	 * Covers/hides the root Radio4000 chrome without editing files outside this folder.
	 * Delete `src/routes/m/` to remove the experiment.
	 */
	import {resolve} from '$app/paths'
	import BottomNav from './bottom-nav.svelte'

	/** @type {{children: import('svelte').Snippet}} */
	const {children} = $props()

	$effect(() => {
		const root = document.documentElement
		root.classList.add('m-proto')
		return () => root.classList.remove('m-proto')
	})
</script>

<div class="m-shell">
	<header class="m-top">
		<a class="m-brand" href={resolve('/m')}>Radio4000</a>
		<span class="m-badge">mobile lab</span>
	</header>

	<main class="m-main">
		{@render children()}
	</main>

	<BottomNav />
</div>

<style>
	/* Hide root shell chrome only while this layout is mounted. */
	:global(html.m-proto .layout > header),
	:global(html.m-proto .deck-strip),
	:global(html.m-proto .compact-decks) {
		display: none !important;
	}

	:global(html.m-proto .layout) {
		padding: 0;
		gap: 0;
	}

	:global(html.m-proto .scroll-area) {
		border: none;
		background: transparent;
		border-radius: 0;
		overflow: hidden;
	}

	:global(html.m-proto .content),
	:global(html.m-proto .content-wrapper) {
		gap: 0;
	}

	.m-shell {
		--m-bg: #0f1419;
		--m-surface: #1a222c;
		--m-bar: #121820;
		--m-ink: #f2efe8;
		--m-muted: #9aa3ad;
		--m-accent: #3ecf8e;
		--m-line: color-mix(in oklab, var(--m-ink) 12%, transparent);
		--m-tap: 48px;
		--m-nav-h: 64px;
		--m-top-h: 56px;
		--m-safe-bottom: env(safe-area-inset-bottom, 0px);
		--m-font: 'IBM Plex Sans', 'Segoe UI', sans-serif;

		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		grid-template-rows: var(--m-top-h) 1fr var(--m-nav-h);
		background: var(--m-bg);
		color: var(--m-ink);
		font-family: var(--m-font);
		overflow: hidden;
	}

	.m-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0 1rem;
		background: var(--m-bar);
		border-bottom: 1px solid var(--m-line);
	}

	.m-brand {
		font-size: 1.05rem;
		font-weight: 650;
		letter-spacing: -0.02em;
		color: inherit;
		text-decoration: none;
	}

	.m-badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--m-muted);
	}

	.m-main {
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
		padding: 1rem 1rem calc(1rem + var(--m-safe-bottom));
		background:
			radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--m-accent) 18%, transparent), transparent 55%),
			var(--m-bg);
	}

	.m-main :global(a) {
		color: var(--m-accent);
	}
</style>
