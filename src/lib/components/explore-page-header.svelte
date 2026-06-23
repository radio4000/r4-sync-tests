<script>
	import PageHeader from './page-header.svelte'
	import ExploreSectionMenu from './explore-section-menu.svelte'

	const {children, filterChips = undefined} = $props()
</script>

<PageHeader wrap>
	<nav class="explore-top-row">
		{@render children?.()}
	</nav>
	<nav class="explore-nav-row">
		<ExploreSectionMenu />
		{#if filterChips}
			<nav class="explore-filter-chips">
				{@render filterChips()}
			</nav>
		{/if}
	</nav>
</PageHeader>

<style>
	.explore-top-row {
		min-width: 0;
		gap: 0.5rem;

		& :global(.search-input) {
			flex: 1 1 0;
			min-width: 4rem;
		}
	}

	nav {
		width: 100%;
		align-items: center;
	}

	.explore-nav-row {
		gap: 1rem;
		justify-content: space-between;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: thin;
	}

	@media (max-width: 768px) {
		.explore-nav-row {
			flex-wrap: wrap;
			overflow-x: visible;
		}

		.explore-filter-chips {
			flex-basis: 100%;
			border-left: none;
			margin-left: 0;
			padding-left: 0;
			padding-top: 0.5rem;
			overflow-x: auto;
			scrollbar-width: none;
		}
	}

	.explore-filter-chips :global(.btn.chip) {
		flex: 0 0 auto;
	}
</style>
