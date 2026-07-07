<script>
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import {analyzeChannel} from './spam-detector.js'
	import {sdk} from '@radio4000/sdk'
	import {spamDecisionsCollection} from '$lib/collections/spam-decisions'
	import {useLiveQuery} from '$lib/useLiveQuery.svelte'
	import {createQuery} from '@tanstack/svelte-query'
	import {normalizeTrackMedia} from '$lib/collections/tracks'

	const MAX_TRACK_COUNT = 10

	const channelsQuery = createQuery(() => ({
		queryKey: ['spam-angel', 'channels', MAX_TRACK_COUNT],
		queryFn: async () => {
			const {data, error} = await sdk.supabase
				.from('channels_with_tracks')
				.select('*')
				.lt('track_count', MAX_TRACK_COUNT)
				.order('created_at', {ascending: false})
			if (error) throw error
			return data ?? []
		},
		staleTime: 5 * 60 * 1000
	}))

	const allChannels = $derived(channelsQuery.data ?? [])
	const loading = $derived(channelsQuery.isPending)
	const error = $derived(channelsQuery.error?.message ?? null)

	// Batch-fetch tracks for every candidate channel in one query, grouped by slug.
	// `channels_with_tracks` only has track_count — the actual rows come from `channel_tracks`.
	const slugs = $derived(allChannels.map((ch) => ch.slug).filter(Boolean))

	const tracksQuery = createQuery(() => ({
		queryKey: ['spam-angel', 'tracks', slugs],
		queryFn: async () => {
			if (!slugs.length) return []
			const {data, error} = await sdk.supabase.from('channel_tracks').select('*').in('slug', slugs)
			if (error) throw error
			const tracks = /** @type {Array<import('$lib/types').Track>} */ (data ?? [])
			return tracks.map(normalizeTrackMedia)
		},
		enabled: slugs.length > 0,
		staleTime: 5 * 60 * 1000
	}))

	const tracksBySlug = $derived.by(() => {
		/** @type {Record<string, Array<import('$lib/types').Track>>} */
		const map = {}
		for (const track of tracksQuery.data ?? []) {
			if (!track.slug) continue
			;(map[track.slug] ??= []).push(track)
		}
		return map
	})

	const decisionsQuery = useLiveQuery((q) => q.from({d: spamDecisionsCollection}))
	const decisions = $derived(decisionsQuery.data ?? [])

	// Channels with spam signals, sorted by confidence (highest first)
	const candidates = $derived(
		allChannels
			.map((ch) => {
				const decision = decisions.find((d) => d.channelId === ch.id)
				const tracks = (ch.slug && tracksBySlug[ch.slug]) || []
				return {
					...ch,
					tracks,
					analysis: analyzeChannel(ch, tracks),
					decision: decision?.spam
				}
			})
			.filter((ch) => ch.analysis.confidence >= 0.2)
			.sort((a, b) => b.analysis.confidence - a.analysis.confidence)
	)

	let expanded = $state(new Set())
	let focusedIndex = $state(0)
	let lastActionChannelId = $state(null)

	function setDecision(channelId, spam) {
		if (spamDecisionsCollection.state.has(channelId)) {
			spamDecisionsCollection.delete(channelId)
		}
		spamDecisionsCollection.insert({channelId, spam})
		lastActionChannelId = channelId
	}

	function undoDecision(channelId) {
		spamDecisionsCollection.delete(channelId)
	}

	function undoLast() {
		if (!lastActionChannelId) return
		undoDecision(lastActionChannelId)
		lastActionChannelId = null
	}

	function isTypingTarget(target) {
		if (!target) return false
		return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
	}

	function handleKeydown(event) {
		if (isTypingTarget(event.target)) return
		if (event.key === 'j' || event.key === 'ArrowDown') {
			event.preventDefault()
			focusedIndex = Math.min(focusedIndex + 1, Math.max(undecided.length - 1, 0))
		} else if (event.key === 'k' || event.key === 'ArrowUp') {
			event.preventDefault()
			focusedIndex = Math.max(focusedIndex - 1, 0)
		} else if (event.key === 's') {
			const channel = undecided[focusedIndex]
			if (channel) setDecision(channel.id, true)
		} else if (event.key === 'e') {
			const channel = undecided[focusedIndex]
			if (channel) setDecision(channel.id, false)
		} else if (event.key === 'u') {
			undoLast()
		}
	}

	function clearAll() {
		if (!confirm('Clear all decisions?')) return
		for (const key of spamDecisionsCollection.state.keys()) {
			spamDecisionsCollection.delete(key)
		}
	}

	function toggleExpand(id) {
		if (expanded.has(id)) {
			expanded.delete(id)
		} else {
			expanded.add(id)
		}
		expanded = expanded
	}

	const undecided = $derived(candidates.filter((ch) => ch.decision === undefined))
	const toDelete = $derived(candidates.filter((ch) => ch.decision === true))
	const toKeep = $derived(candidates.filter((ch) => ch.decision === false))

	function escapeSqlString(str) {
		return str.replace(/'/g, "''")
	}

	const sql = $derived(
		toDelete
			.map(
				(ch) =>
					`-- ${ch.name} (@${ch.slug})\nselect ban_user_by_channel_slug('${escapeSqlString(ch.slug)}');`
			)
			.join('\n\n')
	)

	function copySQL() {
		navigator.clipboard.writeText(sql)
	}

	function formatDate(dateStr) {
		if (!dateStr) return '?'
		const d = new Date(dateStr)
		const now = new Date()
		const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
		if (diffDays < 7) return `${diffDays}d ago`
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
		if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
		return d.getFullYear().toString()
	}

	function confidenceColor(confidence) {
		if (confidence >= 0.6) return 'var(--color-danger, #c00)'
		if (confidence >= 0.4) return 'var(--color-warning, #a50)'
		return 'var(--color-muted, #666)'
	}
</script>

<svelte:head>
	<title>Spam Angel | Radio4000 docs</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<header>
	<div>
		<h1>Spam Angel</h1>
		<p>
			Review and mark suspected spam channels. Nothing is deleted here — use the generated SQL to
			act.
		</p>
	</div>
	<menu>
		<button onclick={clearAll} disabled={toDelete.length === 0 && toKeep.length === 0}
			>Clear all</button
		>
	</menu>
</header>

{#if loading}
	<p>Loading channels…</p>
{:else if error}
	<p>Error: {error}</p>
{/if}

<div class="triage">
	<!-- For Review (top, full width) -->
	<section class="column" data-column="review">
		<details open>
			<summary>For Review ({undecided.length})</summary>
			<p class="hint">j/k or ↓/↑ to move · s to mark spam · e to keep · u to undo</p>
			<ul class="list">
				{#each undecided as channel, i (channel.id)}
					{@const ev = channel.analysis.evidence}
					{@const hasMusic = ev.musicTerms.length > 0}
					{@const isExpanded = expanded.has(channel.id)}
					<li class:focused={i === focusedIndex}>
						<div class="main-row">
							<a href="/{channel.slug}" class="avatar-link">
								<ChannelAvatar id={channel.image} alt={channel.name} size={40} />
							</a>

							<div class="info">
								<div class="title-row">
									<h3><a href="/{channel.slug}">{channel.name}</a></h3>
									<span class="meta">{channel.slug} · {formatDate(channel.created_at)}</span>
								</div>

								<div class="evidence">
									{#if ev.trackSignals.length > 0}
										<span class="tag" data-type="tracks"
											>{ev.trackSignals.slice(0, 3).join(', ')}</span
										>
									{/if}
									{#if ev.keywords.length > 0}
										<span class="tag" data-type="spam"
											>{ev.keywords.slice(0, 4).join(', ')}{ev.keywords.length > 4 ? '…' : ''}</span
										>
									{/if}
									{#if ev.phrases.length > 0}
										<span class="tag" data-type="spam">"{ev.phrases[0]}"</span>
									{/if}
									{#if ev.locations.length > 0}
										<span class="tag" data-type="location">{ev.locations.join(', ')}</span>
									{/if}
									{#if hasMusic}
										<span class="tag" data-type="music">{ev.musicTerms.join(', ')}</span>
									{/if}
								</div>
							</div>

							<span class="score" style="color: {confidenceColor(channel.analysis.confidence)}">
								{Math.round(channel.analysis.confidence * 100)}%
							</span>

							<menu class="actions">
								<button class="danger" onclick={() => setDecision(channel.id, true)}>Spam</button>
								<button onclick={() => setDecision(channel.id, false)}>Keep</button>
							</menu>
						</div>

						{#if isExpanded || (channel.description?.length ?? 0) > 100 || channel.tracks.length > 0}
							<div
								class="expanded"
								class:collapsed={!isExpanded && (channel.description?.length ?? 0) > 100}
							>
								{#if channel.description}
									<p class="desc" onclick={() => toggleExpand(channel.id)}>
										{isExpanded ? channel.description : channel.description?.slice(0, 150)}
										{#if !isExpanded && (channel.description?.length ?? 0) > 150}…{/if}
									</p>
								{/if}
								{#if isExpanded && channel.tracks.length > 0}
									<ul class="track-list">
										{#each channel.tracks as track (track.id)}
											<li>
												<span class="track-title">{track.title}</span>
												<a
													href={track.url}
													rel="nofollow ugc noopener"
													target="_blank"
													class="track-url">{track.url}</a
												>
											</li>
										{/each}
									</ul>
								{:else if !isExpanded && channel.tracks.length > 0}
									<button class="track-toggle" onclick={() => toggleExpand(channel.id)}>
										{channel.tracks.length} track{channel.tracks.length === 1 ? '' : 's'} — show
									</button>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</details>
	</section>

	<!-- Decisions row (bottom, 50/50) -->
	<section class="column" data-column="delete">
		<details open>
			<summary>
				<span>Marked as spam ({toDelete.length})</span>
				<button onclick={copySQL} disabled={toDelete.length === 0}>Copy SQL</button>
			</summary>
			<ul class="list">
				{#each toDelete as channel (channel.id)}
					<li>
						<span class="item-name">{channel.name}</span>
						<span class="meta">@{channel.slug}</span>
						<button onclick={() => undoDecision(channel.id)}>Undo</button>
					</li>
				{/each}
			</ul>
		</details>
	</section>

	<section class="column" data-column="keep">
		<details open>
			<summary>To Keep ({toKeep.length})</summary>
			<ul class="list">
				{#each toKeep as channel (channel.id)}
					<li>
						<span class="item-name">{channel.name}</span>
						<span class="meta">@{channel.slug}</span>
						<button onclick={() => undoDecision(channel.id)}>Undo</button>
					</li>
				{/each}
			</ul>
		</details>
	</section>
</div>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	header h1 {
		margin: 0;
	}

	/* Triage layout: review on top, decisions 50/50 below */
	.triage {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		align-items: start;
	}

	.column {
		min-width: 0;
	}

	.column[data-column='review'] {
		grid-column: 1 / -1;
	}

	.column summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-weight: 600;
		cursor: var(--interactive-cursor, pointer);
		padding: 0.5rem;
		background: var(--gray-2);
		border-radius: var(--border-radius);
	}

	.column summary button {
		font-size: var(--font-4);
	}

	.column[data-column='delete'] summary::before {
		content: '×';
	}
	.column[data-column='keep'] summary::before {
		content: '✓';
	}

	.column .list {
		max-height: 70vh;
		overflow-y: auto;
	}

	/* Side column items (delete/keep) */
	.column[data-column='delete'] li,
	.column[data-column='keep'] li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.item-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Review column card styles */
	h3 {
		margin: 0;
		font-weight: normal;
	}
	h3 a {
		color: inherit;
		text-decoration: none;
	}
	h3 a:hover {
		text-decoration: underline;
	}
	.avatar-link {
		flex-shrink: 0;
	}
	.main-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.main-row :global(.placeholder) {
		min-width: 40px;
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.title-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.meta {
		font-size: var(--font-4);
		opacity: 0.5;
	}
	.evidence {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-top: var(--space-1);
	}
	.tag {
		font-size: var(--font-4);
		padding: 0.1em 0.4em;
		border-radius: var(--border-radius);
	}
	.tag[data-type='spam'] {
		background: light-dark(hsl(0 70% 90%), hsl(0 40% 25%));
	}
	.tag[data-type='location'] {
		background: light-dark(hsl(30 70% 90%), hsl(30 40% 25%));
	}
	.tag[data-type='music'] {
		background: light-dark(hsl(120 50% 90%), hsl(120 30% 25%));
	}
	.tag[data-type='tracks'] {
		background: light-dark(hsl(260 60% 90%), hsl(260 35% 28%));
	}
	.score {
		min-width: 2.5rem;
		text-align: right;
		font-weight: bold;
	}
	.actions {
		display: flex;
		gap: var(--space-1);
	}
	.expanded {
		margin-top: 0.5rem;
		margin-left: 48px;
	}
	.expanded.collapsed {
		cursor: var(--interactive-cursor, pointer);
	}
	.desc {
		margin: 0;
		opacity: 0.8;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.track-toggle {
		font-size: var(--font-4);
		opacity: 0.7;
	}
	.track-list {
		list-style: none;
		margin: var(--space-1) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--font-4);
	}
	.track-list li {
		display: flex;
		flex-direction: column;
		gap: 0.1em;
	}
	.track-title {
		opacity: 0.9;
	}
	.track-url {
		opacity: 0.6;
		word-break: break-all;
	}
	.hint {
		font-size: var(--font-4);
		opacity: 0.6;
		margin: 0.25rem 0 0.5rem;
	}
	.list li.focused {
		outline: 2px solid var(--accent-9);
		outline-offset: 2px;
		border-radius: var(--border-radius);
	}

	/* Mobile: stack all vertically */
	@media (max-width: 640px) {
		.triage {
			grid-template-columns: 1fr;
		}
		.column[data-column='review'] {
			grid-column: 1;
		}
	}
</style>
