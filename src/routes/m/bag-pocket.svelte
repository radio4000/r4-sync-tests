<script>
	import {fly} from 'svelte/transition'
	import {ensureActiveDeck, loadDeckView, playTrack} from '$lib/api'
	import {parseView, viewLabel} from '$lib/views'
	import {queryView} from '$lib/views.svelte'
	import Icon from '$lib/components/icon.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Sheet from './sheet.svelte'
	import {bag, bagViewURI, clearBag, removeIngredient} from './bag.svelte.js'

	let open = $state(false)
	let going = $state(false)

	const count = $derived(bag.ingredients.length)
	const uri = $derived(bagViewURI())
	const view = $derived(parseView(uri))
	// Prefetches as the bag changes (24h staleTime), so go() is usually instant.
	const viewQuery = queryView(() => ({...view, limit: 4000}))
	const ready = $derived(count > 0 && !viewQuery.loading && !going)

	/** @type {Record<string, string>} */
	const kindIcon = {channel: 'radio', tag: 'hash', search: 'search'}
	/** @type {Record<string, string>} */
	const kindLabel = {channel: 'radio', tag: 'tag', search: 'search'}

	async function go() {
		if (!ready) return
		going = true
		try {
			// order=shuffle in the view means tracks arrive pre-shuffled
			const ids = viewQuery.tracks.map((t) => t.id)
			if (!ids.length) return
			const deck = ensureActiveDeck()
			loadDeckView(deck.id, view, ids, {title: viewLabel(view)})
			deck.shuffle = true
			open = false
			await playTrack(deck.id, ids[0], null, 'play_channel')
		} finally {
			going = false
		}
	}
</script>

{#if count}
	<div class="m-pocket-wrap" transition:fly={{y: 24, duration: 200}}>
		<div class="m-pocket">
			<button type="button" class="m-pocket-open" onclick={() => (open = true)}>
				<span class="m-pocket-stack" aria-hidden="true">
					{#each bag.ingredients.slice(-4) as item (item.id)}
						<span class="m-pocket-dot">
							{#if item.kind === 'channel' && item.image}
								<span class="m-avatar-clip m-pocket-avatar">
									<ChannelAvatar id={item.image} alt="" size={64} />
								</span>
							{:else}
								<Icon icon={kindIcon[item.kind]} size={13} />
							{/if}
						</span>
					{/each}
				</span>
				<span class="m-pocket-label">
					{count}
					{count === 1 ? 'source' : 'sources'} in the bag
				</span>
			</button>
			<button
				type="button"
				class="m-pocket-go"
				aria-label="Shuffle and play"
				disabled={!ready}
				onclick={go}
			>
				<Icon icon="shuffle" size={16} />
			</button>
		</div>
	</div>
{/if}

<Sheet {open} title="Bag" onclose={() => (open = false)}>
	<div class="m-bag">
		<header class="m-bag-head">
			<h2>The bag</h2>
		</header>

		<ul class="m-bag-list">
			{#each bag.ingredients as item (item.id)}
				<li class="m-bag-row">
					{#if item.kind === 'channel' && item.image}
						<span class="m-avatar-clip m-bag-avatar">
							<ChannelAvatar id={item.image} alt="" size={96} />
						</span>
					{:else}
						<span class="m-bag-glyph"><Icon icon={kindIcon[item.kind]} size={18} /></span>
					{/if}
					<span class="m-bag-text">
						<span class="m-bag-label">{item.kind === 'tag' ? `#${item.label}` : item.label}</span>
						<span class="m-bag-sub">{kindLabel[item.kind]}</span>
					</span>
					<button
						type="button"
						class="m-ctrl m-bag-remove"
						aria-label="Remove {item.label}"
						onclick={() => removeIngredient(item.id)}
					>
						<Icon icon="close" size={16} />
					</button>
				</li>
			{:else}
				<li class="m-bag-empty">Empty. Tap + on anything out there.</li>
			{/each}
		</ul>

		{#if uri}
			<code class="m-bag-uri">r4://{uri}</code>
			<p class="m-bag-count">
				{viewQuery.loading ? 'Gathering tracks…' : `${viewQuery.count} tracks`}
			</p>
		{/if}

		<footer class="m-bag-actions">
			<button type="button" class="btn m-bag-clear" disabled={!count} onclick={clearBag}>
				Empty the bag
			</button>
			<button type="button" class="m-bag-go" disabled={!ready} onclick={go}>
				<Icon icon="shuffle" size={20} />
				{going ? 'Starting…' : 'Shuffle & go'}
			</button>
		</footer>
	</div>
</Sheet>

<style>
	.m-pocket-wrap {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		z-index: 900;
		display: flex;
		justify-content: center;
		padding: var(--space-2) var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
		pointer-events: none;
	}

	.m-pocket {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 3.25rem;
		max-width: 100%;
		padding: 0 var(--space-1) 0 var(--space-2);
		border: 1px solid var(--color-interface-border);
		border-radius: 999px;
		background: var(--gray-2);
		color: var(--gray-12);
		box-shadow: var(--shadow-modal);
	}

	.m-pocket-open {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.m-pocket-stack {
		display: inline-flex;
		align-items: center;
	}

	.m-pocket-dot {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 999px;
		background: var(--gray-4);
		border: 2px solid var(--gray-2);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.m-pocket-dot + .m-pocket-dot {
		margin-inline-start: -0.6rem;
	}

	.m-pocket-avatar {
		width: 100%;
		height: 100%;
	}

	.m-pocket-label {
		font-size: var(--font-4);
		font-weight: 650;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.m-pocket-go {
		width: 2.5rem;
		height: 2.5rem;
		border: 0;
		border-radius: 999px;
		background: var(--accent);
		color: var(--gray-1);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		cursor: pointer;
	}

	.m-pocket-go:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.m-bag {
		display: grid;
		gap: var(--space-3);
		align-content: start;
	}

	.m-bag-head h2 {
		margin: 0;
		font-size: var(--font-6);
	}

	.m-bag-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		border-radius: calc(var(--border-radius) * 2.5);
		overflow: hidden;
		background: var(--gray-3);
	}

	.m-bag-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-2);
	}

	.m-bag-row + .m-bag-row {
		border-top: 1px solid var(--color-interface-border);
	}

	.m-bag-avatar,
	.m-bag-glyph {
		width: 2.25rem;
		height: 2.25rem;
		flex-shrink: 0;
	}

	.m-bag-glyph {
		border-radius: 999px;
		background: var(--gray-5);
		color: var(--gray-11);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.m-bag-text {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.m-bag-label {
		font-size: var(--font-4);
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.m-bag-sub {
		font-size: var(--font-2);
		color: var(--gray-10);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.m-bag-remove {
		width: 2rem;
		height: 2rem;
		min-width: 2rem;
		min-height: 2rem;
	}

	.m-bag-empty {
		padding: var(--space-3);
		color: var(--gray-10);
		font-size: var(--font-4);
	}

	.m-bag-uri {
		display: block;
		padding: var(--space-2);
		border-radius: var(--border-radius);
		background: var(--gray-3);
		color: var(--gray-10);
		font-size: var(--font-2);
		overflow-x: auto;
		white-space: nowrap;
	}

	.m-bag-count {
		margin: 0;
		font-size: var(--font-2);
		color: var(--gray-10);
	}

	.m-bag-actions {
		display: flex;
		gap: var(--space-2);
	}

	.m-bag-clear {
		border-radius: 999px;
	}

	.m-bag-go {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 3.25rem;
		border: 0;
		border-radius: 999px;
		background: var(--accent);
		color: var(--gray-1);
		font: inherit;
		font-size: var(--font-5);
		font-weight: 650;
		cursor: pointer;
	}

	.m-bag-go:disabled,
	.m-bag-clear:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
