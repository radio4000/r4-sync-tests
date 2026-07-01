<script>
	import {onMount} from 'svelte'
	import Icon from './icon.svelte'
	import * as m from '$lib/paraglide/messages'

	/** @type {{channels: import('$lib/types').Channel[], zoom: number, overlayHref: string, compact?: boolean, onvisible?: () => void}} */
	let {channels, zoom, overlayHref, compact = false, onvisible} = $props()

	let section = $state(/** @type {HTMLDivElement | undefined} */ (undefined))
	let visible = $state(false)
	let HomeMapChannels = $state(
		/** @type {typeof import('./map-channels.svelte').default | null} */ (null)
	)

	onMount(() => {
		if (!section || visible) return

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return
				visible = true
				onvisible?.()
				observer.disconnect()
			},
			{rootMargin: '400px 0px'}
		)

		observer.observe(section)
		return () => observer.disconnect()
	})

	$effect(() => {
		if (!visible || HomeMapChannels) return
		void import('./map-channels.svelte').then((module) => {
			HomeMapChannels = module.default
		})
	})
</script>

<div class="globe" class:compact bind:this={section}>
	{#if HomeMapChannels && visible}
		<HomeMapChannels {channels} globeMode={true} {zoom} syncUrl={false} showControls={false} />
	{:else}
		<div class="globe-placeholder" aria-hidden="true"></div>
	{/if}
	<a href={overlayHref} class="btn map-overlay-btn" aria-label={m.nav_map()}>
		<Icon icon="fullscreen" size={14} />
	</a>
</div>

<style>
	.globe {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 50dvh;
		margin-top: -0.75rem;
		background: transparent;
		border-radius: var(--border-radius);
		overflow: hidden;
		:global(.map) {
			flex: 1;
			min-height: 0;
		}
		:global(article .description) {
			display: none;
		}
	}

	.globe.compact {
		max-height: 55dvh;
		z-index: 0;
	}

	.globe-placeholder {
		flex: 1;
		min-height: 50dvh;
		background:
			radial-gradient(circle at 50% 42%, rgb(105 160 255 / 0.22), transparent 18%),
			radial-gradient(circle at 50% 50%, rgb(36 72 126 / 0.85), rgb(9 15 24 / 0.95) 72%);
	}

	.map-overlay-btn {
		position: absolute;
		bottom: 0.5rem;
		left: 0.5rem;
		z-index: 10;
		opacity: 0.7;
		&:hover {
			opacity: 1;
		}
	}
</style>
