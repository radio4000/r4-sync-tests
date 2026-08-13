<script>
	import {resolve} from '$app/paths'
	import {page} from '$app/state'

	const items = [
		{href: '/m', label: 'Home', routeId: '/m'},
		{href: '/m/search', label: 'Search', routeId: '/m/search'},
		{href: '/m/you', label: 'You', routeId: '/m/you'}
	]

	const routeId = $derived(page.route.id ?? '')
</script>

<nav class="m-nav" aria-label="Mobile prototype">
	{#each items as item (item.href)}
		{@const current = routeId === item.routeId}
		<a
			href={resolve(/** @type {'/m' | '/m/search' | '/m/you'} */ (item.href))}
			class="m-nav-item"
			aria-current={current ? 'page' : undefined}
		>
			<span class="m-nav-dot" aria-hidden="true"></span>
			<span>{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.m-nav {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		align-items: stretch;
		height: 100%;
		padding-bottom: env(safe-area-inset-bottom, 0px);
		background: var(--m-bar, #121820);
		border-top: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
	}

	.m-nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		min-height: var(--m-tap, 48px);
		padding: 0.35rem 0.5rem;
		color: var(--m-muted, #9aa3ad);
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.m-nav-dot {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 999px;
		background: currentColor;
		opacity: 0.35;
	}

	.m-nav-item[aria-current='page'] {
		color: var(--m-ink, #f2efe8);
	}

	.m-nav-item[aria-current='page'] .m-nav-dot {
		background: var(--m-accent, #3ecf8e);
		opacity: 1;
	}
</style>
