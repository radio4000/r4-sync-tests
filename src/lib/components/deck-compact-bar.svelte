<script>
	import {goto} from '$app/navigation'
	import {resolve} from '$app/paths'
	import {appState, canEditChannel, removeDeck} from '$lib/app-state.svelte'
	import {channelsCollection} from '$lib/collections/channels'
	import {broadcastsCollection} from '$lib/collections/broadcasts'
	import {
		togglePlayPause,
		next,
		previous,
		getMediaPlayer,
		resyncAutoRadio,
		clearUserInitiatedPlay,
		toggleDeckCompact,
		toggleShuffle
	} from '$lib/api'
	import {getBroadcastingChannelId, notifyBroadcastState} from '$lib/broadcast'
	import {createDeckDisplay} from '$lib/player/deck-display.svelte'
	import {isListening, isAutoRadio, listeningChannelId} from '$lib/player/clock'
	import {getActiveQueue, canPlay, canPrev, canNext} from '$lib/player/queue'
	import {parseUrl} from 'media-now/parse-url'
	import * as m from '$lib/paraglide/messages'
	import Icon from '$lib/components/icon.svelte'
	import ChannelMicroCard from '$lib/components/channel-micro-card.svelte'
	import TrackCard from '$lib/components/track-card.svelte'
	import SpeedControl from '$lib/components/speed-control.svelte'
	import VolumeControl from '$lib/components/volume-control.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.svelte.js'
	import PlayerProgress from '$lib/components/player-progress.svelte'
	import {channelPresence} from '$lib/presence.svelte'
	import {viewLabel} from '$lib/views'

	/** @type {{deckId: number, showEdgeControls?: boolean}} */
	let {deckId, showEdgeControls = true} = $props()

	let deck = $derived(appState.decks[deckId])
	let isActiveDeck = $derived(appState.active_deck_id === deckId)
	let listeningDeckIds = $derived(
		Object.keys(appState.decks)
			.map(Number)
			.sort((a, b) => a - b)
			.filter((id) => isListening(appState.decks[id]))
	)
	let isListeningGroupControlDeck = $derived(
		!isListening(deck) || listeningDeckIds[0] === deckId
	)

	const display = createDeckDisplay(deckId)
	const track = $derived(display.track)
	const displayTrack = $derived(display.displayTrack)
	const displayChannel = $derived(display.displayChannel)
	const headerChannel = $derived(display.headerChannel)
	const secondaryChannel = $derived(display.secondaryHeaderChannel)
	const listenSlug = $derived.by(() => {
		const id = listeningChannelId(deck)
		if (!id) return undefined
		return (
			channelsCollection.state.get(id)?.slug ??
			broadcastsCollection.state.get(id)?.channels?.slug
		)
	})
	const broadcastSlug = $derived(
		deck?.broadcasting_channel_id
			? channelsCollection.state.get(deck.broadcasting_channel_id)?.slug
			: undefined
	)
	const autoUri = $derived(
		isAutoRadio(deck) && deck.playlist_slug
			? viewLabel(deck.view ?? {sources: [{channels: [deck.playlist_slug]}]}) ||
					`@${deck.playlist_slug}`
			: undefined
	)
	const modePresenceCount = $derived(
		isListening(deck) && listenSlug
			? (channelPresence[listenSlug]?.broadcast ?? 0)
			: deck?.broadcasting_channel_id && broadcastSlug
				? (channelPresence[broadcastSlug]?.broadcast ?? 0)
				: autoUri && deck?.playlist_slug
					? (channelPresence[deck.playlist_slug]?.byUri?.[autoUri] ?? 0)
					: 0
	)
	let canEditTrackChannel = $derived(
		Boolean(displayChannel?.id && canEditChannel(displayChannel.id))
	)
	let trackHref = $derived(
		!appState.embed_mode && displayTrack?.slug && displayTrack?.id
			? resolve('/[slug]/tracks/[tid]', {slug: displayTrack.slug, tid: String(displayTrack.id)})
			: undefined
	)
	let provider = $derived(
		displayTrack?.provider ||
			(displayTrack?.url ? parseUrl(displayTrack.url)?.provider : null) ||
			null
	)

	let activeQueue = $derived(getActiveQueue(deck))
	let canPlayFromQueue = $derived(canPlay(activeQueue, track?.id))
	let canPrevFromQueue = $derived(canPrev(activeQueue, track?.id))
	let canNextFromQueue = $derived(canNext(activeQueue, track?.id))

	let mediaDuration = $derived(deck?.media_duration ?? NaN)
	let mediaCurrentTime = $derived(deck?.media_current_time ?? 0)
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	class="deck-compact-bar"
	class:active-deck={isActiveDeck}
	onclick={(e) => {
		if (e.target instanceof Element && e.target.closest('a, button, input, menu')) return
		appState.active_deck_id = deckId
	}}
>
	{#if appState.show_track_range_control !== false && displayTrack}
		<PlayerProgress
			currentTime={mediaCurrentTime}
			{mediaDuration}
			trackDuration={displayTrack?.duration}
			isPlaying={Boolean(deck?.is_playing)}
			disabled={isListening(deck) || isAutoRadio(deck)}
			onseek={(val) => {
				if (deck) deck.media_current_time = val
				const mediaElement = getMediaPlayer(deckId)
				if (mediaElement) mediaElement.currentTime = val
			}}
		/>
	{/if}
	<div class="header-info" class:active-track-bg={Boolean(displayTrack)}>
		{#if showEdgeControls && (!isListening(deck) || isListeningGroupControlDeck)}
			<button
				class="close-deck"
				onclick={() => {
					const bchId = getBroadcastingChannelId()
					clearUserInitiatedPlay(deckId)
					removeDeck(deckId)
					if (bchId) notifyBroadcastState(bchId)
				}}
				aria-label={m.player_tooltip_close_deck()}
				{@attach tooltip({content: m.player_tooltip_close_deck()})}
			>
				<Icon icon="close" />
			</button>
		{/if}
		<div class="channel-panel">
			{#if headerChannel}
				<ChannelMicroCard
					channel={headerChannel}
					href={appState.embed_mode ? undefined : resolve('/[slug]', {slug: headerChannel.slug})}
				/>
			{/if}
			{#if secondaryChannel}
				<ChannelMicroCard
					channel={secondaryChannel}
					href={appState.embed_mode ? undefined : resolve('/[slug]', {slug: secondaryChannel.slug})}
				/>
			{/if}
		</div>
		{#if displayTrack}
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
			<div
				class="track-panel"
				onclick={(e) => {
					if (!trackHref) return
					if (e.target instanceof Element && e.target.closest('button, a')) return
					goto(trackHref)
				}}
			>
				<TrackCard
					track={displayTrack}
					{deckId}
					canEdit={canEditTrackChannel}
					menuAlign="end"
					menuValign="top"
				/>
			</div>
		{/if}
		<menu class="controls">
			{#if !isListening(deck) && !isAutoRadio(deck)}
				<button
					onclick={() => previous(deckId, 'user_prev')}
					aria-label={m.player_compact_prev()}
					disabled={!canPrevFromQueue}
				>
					<Icon icon="previous-fill" />
				</button>
				<button
					class="play"
					class:active={deck?.is_playing}
					onclick={() => togglePlayPause(deckId)}
					aria-label={m.player_compact_play_pause()}
					disabled={!canPlayFromQueue}
				>
					<Icon icon={deck?.is_playing ? 'pause' : 'play-fill'} />
				</button>
				<button
					onclick={() => next(deckId, 'user_next')}
					aria-label={m.player_compact_next()}
					disabled={!canNextFromQueue}
				>
					<Icon icon="next-fill" />
				</button>
				{#if activeQueue.length > 2}
					<button
						onclick={() => toggleShuffle(deckId)}
						class:active={deck?.shuffle}
						aria-label={m.player_tooltip_shuffle()}
						{@attach tooltip({content: m.player_tooltip_shuffle()})}
					>
						<Icon icon="shuffle" />
					</button>
				{/if}
				<SpeedControl {deckId} {provider} />
				<VolumeControl {deckId} />
			{:else if isAutoRadio(deck)}
				{@const autoNotSynced = !!deck?.drifted}
				<button
					class="play"
					class:active={deck?.is_playing}
					onclick={() => togglePlayPause(deckId)}
					aria-label={m.player_compact_play_pause()}
					disabled={!canPlayFromQueue}
				>
					<Icon icon={deck?.is_playing ? 'pause' : 'play-fill'} />
				</button>
				<button
					class="auto-sync"
					class:active={!autoNotSynced}
					title={autoNotSynced ? m.auto_radio_resync() : m.auto_radio_join()}
					aria-label={autoNotSynced ? m.auto_radio_resync() : m.auto_radio_join()}
					onclick={() => resyncAutoRadio(deckId)}
				>
					<Icon icon="infinite" size={12} />
					<span class="auto-sync-label">{autoNotSynced ? 'sync' : 'auto'}</span>
					<span class="live-circle" aria-hidden="true">◉</span>
					{#if modePresenceCount > 0}
						<span class="live-count">{modePresenceCount}</span>
					{/if}
				</button>
			{:else if !isListening(deck)}
				<VolumeControl {deckId} />
			{/if}
			{#if showEdgeControls && isListeningGroupControlDeck}
				<button
					class="expand"
					onclick={() => toggleDeckCompact(deckId)}
					aria-label={m.player_compact_show_panel()}
					{@attach tooltip({content: m.player_compact_show_panel()})}
				>
					<Icon icon="deck-panel" expanded />
				</button>
			{/if}
		</menu>
	</div>
</div>

<style>
	.deck-compact-bar {
		min-height: 49px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		border-top: 1px solid var(--gray-6);
		min-width: 0;
		overflow: visible;
	}

	.deck-compact-bar :global(.progress) {
		flex: 1 0 100%;
		width: 100%;
		min-width: 0;
		padding-bottom: 0;
	}

	.header-info {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-1);
		min-width: 0;
		flex: 1 1 auto;
		width: 100%;
		min-height: 2rem;
		padding-inline: 0.5rem;
		padding-block: var(--space-1);
	}

	.close-deck {
		order: 0;
		flex: 0 0 auto;
		align-self: center;
	}

	.channel-panel {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: var(--space-1);
		min-width: 0;
		flex: 0 0 auto;
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
		order: 1;
		align-self: center;
	}

	.channel-panel::-webkit-scrollbar {
		display: none;
	}

	:global(.channel-panel .channel-micro-card) {
		flex: 0 0 auto;
		max-width: max-content;
		align-self: center;
		background: none;
		border: none;
	}

	.track-panel {
		min-width: 0;
		flex: 1 1 14rem;
		width: auto;
		max-width: none;
		cursor: pointer;
		order: 2;
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: nowrap;
		gap: var(--space-1);
		flex: 1 0 100%;
		width: 100%;
		min-width: 0;
		order: 3;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.controls::-webkit-scrollbar {
		display: none;
	}

	.controls .auto-sync.active :global(svg) {
		color: var(--accent-9);
	}

	.controls :global(.speed),
	.controls :global(.volume) {
		flex: 1 1 7rem;
		min-width: 0;
		max-width: none;
	}

	/* Force compact controls to be fully shrinkable despite component defaults */
	.controls :global(.speed .speed-btn) {
		min-width: 0;
	}

	.controls :global(.speed .range),
	.controls :global(.volume .range),
	.controls :global(.volume media-mute-button),
	.controls :global(.volume .btn) {
		min-width: 0;
	}

	.expand {
		flex: 0 0 auto;
		align-self: center;
		margin-left: auto;
		order: 3;
	}

	.track-panel :global(article) {
		height: 100%;
		outline: 0;
		outline-offset: 0;
	}

	.track-panel :global(article.active) {
		background: transparent;
	}

	.track-panel :global(.popover-menu) {
		flex: 0 0 auto;
	}

	.track-panel :global(.card) {
		padding: 0;
	}

	.track-panel :global(h3 + p) {
		max-width: 100%;
	}

	@media (max-width: 767px) {
		.header-info {
			padding-inline: var(--space-1);
			gap: var(--space-1);
			align-items: center;
		}

		.channel-panel {
			flex: 0 0 auto;
			order: 1;
			max-width: 100%;
		}

		:global(.channel-panel .channel-micro-card) {
			min-height: 1.35rem;
			padding: 0.08rem var(--space-1) 0.08rem 0.08rem;
		}

		:global(.channel-panel .channel-micro-card .slug) {
			max-width: 8ch;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.track-panel {
			display: block;
			flex: 1 1 14rem;
			width: auto;
			max-width: none;
		}

		.controls {
			gap: var(--space-1);
			flex: 1 1 auto;
			width: 100%;
			flex-wrap: nowrap;
		}

		.controls .auto-sync {
			flex: 1 1 auto;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: var(--space-1);
			overflow: hidden;
		}

		.controls .auto-sync .auto-sync-label {
			font-size: var(--font-1);
			white-space: nowrap;
		}

		.controls .auto-sync .live-circle {
			font-size: 0.55em;
			color: var(--accent-9);
		}

		.controls .auto-sync .live-count {
			font-size: var(--font-1);
			color: var(--gray-11);
		}

		.controls :global(.speed),
		.controls :global(.volume) {
			flex: 1 1 5rem;
			max-width: none;
		}

		.controls :global(.speed .speed-btn),
		.controls :global(.volume .btn),
		.controls :global(.volume media-mute-button) {
			min-width: 0;
			padding-inline: var(--space-1);
			font-size: var(--font-1);
		}

		.expand {
			align-self: center;
			margin-left: auto;
		}
	}

	@media (min-width: 768px) {
		.header-info {
			align-items: center;
			flex-wrap: nowrap;
		}

		.track-panel {
			order: 3;
			flex: 1 1 18rem;
			width: auto;
			max-width: none;
		}

		.controls {
			order: 4;
			flex: 0 1 auto;
			width: auto;
			overflow-x: visible;
		}

		.controls :global(.speed),
		.controls :global(.volume) {
			flex: 1 1 6.75rem;
		}

		.expand {
			order: 5;
		}
	}
</style>
