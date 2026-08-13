<script>
	/**
	 * Throwaway mobile-native prototype shell.
	 * Covers/hides the root Radio4000 chrome without editing files outside this folder.
	 * Delete `src/routes/m/` to remove the experiment.
	 */
	import './m.css'
	import BagPocket from './bag-pocket.svelte'

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
		<BagPocket />
	</div>
</div>

<style>
	:global(html.m-proto .layout > header) {
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

	/* Keep the page <main> capped to the scroll-area height so the /m shell
	   drives its own internal scroll and the deck strip sits flush below. */
	:global(html.m-proto main) {
		min-height: 0;
	}

	:global(html.m-proto .content),
	:global(html.m-proto .content-wrapper) {
		gap: 0;
	}

	.m-shell {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		background: var(--color-interface);
		color: var(--gray-12);
		overflow: hidden;
	}

	.m-page {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
