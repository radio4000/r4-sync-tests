<script>
	/**
	 * Throwaway mobile-native prototype shell.
	 * Covers/hides the root Radio4000 chrome without editing files outside this folder.
	 * Delete `src/routes/m/` to remove the experiment.
	 */
	/** @type {{children: import('svelte').Snippet}} */
	const {children} = $props()

	$effect(() => {
		const root = document.documentElement
		root.classList.add('m-proto')
		return () => root.classList.remove('m-proto')
	})
</script>

<div class="m-shell">
	<div class="m-page">
		{@render children()}
	</div>
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
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		background: var(--color-interface);
		color: var(--gray-12);
		overflow: hidden;
	}

	.m-page {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
