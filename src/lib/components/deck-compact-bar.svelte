<script>
	import {untrack} from 'svelte'
	import {goto} from '$app/navigation'
	import {resolve} from '$app/paths'
	import {appState, canEditChannel} from '$lib/app-state.svelte'
	import {
		togglePlayPause,
		next,
		previous,
		getMediaPlayer,
		resyncAutoRadio,
		toggleDeckCompact,
		expandDeck,
		toggleShuffle
	} from '$lib/api'
	import {isMobileViewport} from '$lib/utils'
	import {createDeckDisplay} from '$lib/player/deck-display.svelte'
	import {getActiveQueue, canPlay, canPrev, canNext} from '$lib/player/queue'
	import {parseUrl} from 'media-now/parse-url'
	import * as m from '$lib/paraglide/messages'
	import Icon from '$lib/components/icon.svelte'
	import PopoverMenu from '$lib/components/popover-menu.svelte'
	import DeckMenu from '$lib/components/deck-menu.svelte'
	import AutoRadioButton from '$lib/components/auto-radio-button.svelte'
	import ChannelMicroCard from '$lib/components/channel-micro-card.svelte'
	import TrackCard from '$lib/components/track-card.svelte'
	import SpeedControl from '$lib/components/speed-control.svelte'
	import VolumeControl from '$lib/components/volume-control.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.svelte.js'
	import PlayerProgress from '$lib/components/player-progress.svelte'
	import {channelPresence} from '$lib/presence.svelte'
	import {viewLabel} from '$lib/views'
	import {shortcutHint} from '$lib/keyboard'

	/** @type {{deckId: number, showEdgeControls?: boolean}} */
	let {deckId, showEdgeControls = true} = $props()

	let deck = $derived(appState.decks[deckId])
	let isActiveDeck = $derived(appState.active_deck_id === deckId)
	let listeningDeckIds = $derived(
		Object.keys(appState.decks)
			.map(Number)
			.sort((a, b) => a - b)
			.filter((id) => Boolean(appState.decks[id]?.listening_to_channel_id))
	)
	let isListeningGroupControlDeck = $derived(
		!deck?.listening_to_channel_id || listeningDeckIds[0] === deckId
	)

	// deckId never changes for this component instance — it's rendered inside
	// an {#each ... (deckId)} keyed block, so a changed deckId remounts it.
	const display = createDeckDisplay(untrack(() => deckId))
	const track = $derived(display.track)
	const displayTrack = $derived(display.displayTrack)
	const displayChannel = $derived(display.displayChannel)
	const headerChannel = $derived(display.headerChannel)
	const secondaryChannel = $derived(display.secondaryHeaderChannel)
	const listenSlug = $derived(display.listenSlug)
	const broadcastSlug = $derived(display.broadcastSlug)
	const autoUri = $derived(
		deck?.auto_radio && deck.playlist_slug
			? viewLabel(deck.view ?? {sources: [{channels: [deck.playlist_slug]}]}) ||
					`@${deck.playlist_slug}`
			: undefined
	)
	const modePresenceCount = $derived(
		deck?.listening_to_channel_id && listenSlug
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

	let deckMenu = $state(/** @type {{close: () => void} | undefined} */ (undefined))
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	class="deck-compact-bar"
	class:active-deck={isActiveDeck}
	onclick={(e) => {
		if (e.target instanceof Element && e.target.closest('a, button, input, menu')) return
		appState.active_deck_id = deckId
		if (isMobileViewport()) expandDeck(deckId)
	}}
>
	<div class="header-info" class:active-track-bg={Boolean(displayTrack)}>
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
					if (isMobileViewport()) return
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
		{#if appState.show_track_range_control !== false && displayTrack}
			<PlayerProgress
				currentTime={mediaCurrentTime}
				{mediaDuration}
				trackDuration={displayTrack?.duration}
				isPlaying={Boolean(deck?.is_playing)}
				disabled={Boolean(deck?.listening_to_channel_id)}
				onseek={(val) => {
					if (deck) deck.media_current_time = val
					const mediaElement = getMediaPlayer(deckId)
					if (mediaElement) mediaElement.currentTime = val
				}}
			/>
		{/if}
		<menu class="controls">
			<div class="controls-center">
				{#if !deck?.listening_to_channel_id && !deck?.auto_radio}
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
							{@attach tooltip({
								content: m.player_tooltip_shuffle() + shortcutHint('toggleShuffle')
							})}
						>
							<Icon icon="shuffle" />
						</button>
					{/if}
					<SpeedControl {deckId} {provider} />
					<VolumeControl {deckId} />
				{:else if deck?.auto_radio}
					<button
						class="play"
						class:active={deck?.is_playing}
						onclick={() => togglePlayPause(deckId)}
						aria-label={m.player_compact_play_pause()}
						disabled={!canPlayFromQueue}
					>
						<Icon icon={deck?.is_playing ? 'pause' : 'play-fill'} />
					</button>
					<AutoRadioButton
						live
						drifted={!!deck?.auto_radio_drifted}
						size={14}
						count={modePresenceCount}
						onclick={() => resyncAutoRadio(deckId)}
					/>
				{:else if !deck?.listening_to_channel_id}
					<VolumeControl {deckId} />
				{/if}
			</div>
			{#if showEdgeControls && (!deck?.listening_to_channel_id || isListeningGroupControlDeck)}
				<PopoverMenu
					align="end"
					valign="top"
					closeOnClick={false}
					btnClass="ghost"
					bind:this={deckMenu}
				>
					{#snippet trigger()}
						<Icon icon="options-horizontal" />
					{/snippet}
					<DeckMenu {deckId} compact closeMenu={() => deckMenu?.close()} />
				</PopoverMenu>
			{/if}
			{#if showEdgeControls && isListeningGroupControlDeck}
				<button
					class="expand"
					onclick={() => toggleDeckCompact(deckId)}
					aria-label={m.player_compact_show_panel()}
					{@attach tooltip({
						content: m.player_compact_show_panel() + shortcutHint('toggleCompactDeck')
					})}
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
		background-color: var(--gray-1);
	}

	.deck-compact-bar :global(.progress) {
		grid-area: progress;
		min-width: 0;
		padding: 0;
	}

	/* Grid: channel+track with controls to the right, progress full width below */
	.header-info {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas:
			'channel track controls'
			'progress progress progress';
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
		flex: 1 1 auto;
		width: 100%;
		min-height: 2rem;
		padding-inline: 0.5rem;
		padding-block: var(--space-1);
	}

	/* Deck-actions menu (settings + remove) groups with the expand toggle at the
	   right end of the controls row. margin-left:auto pushes the pair over. */
	.controls :global(.popover-menu) {
		flex: 0 0 auto;
		align-self: center;
		margin-left: auto;
	}

	.channel-panel {
		grid-area: channel;
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: var(--space-1);
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
		align-self: center;
	}

	.channel-panel::-webkit-scrollbar {
		display: none;
	}

	:global(.channel-panel .channel-micro-card) {
		--track-artwork-size: 1rem;
		flex: 0 0 auto;
		max-width: max-content;
		align-self: center;
		background: none;
		border: none;
	}

	.track-panel {
		grid-area: track;
		min-width: 0;
		cursor: pointer;
	}

	.controls {
		grid-area: controls;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: nowrap;
		gap: var(--space-1);
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.controls-center {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: var(--space-1);
		min-width: 0;
	}

	.controls::-webkit-scrollbar {
		display: none;
	}

	.controls :global(.speed),
	.controls :global(.volume) {
		flex: 1 1 7rem;
		min-width: 0;
		max-width: none;
	}
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

	@media (max-width: 768px) {
		.header-info {
			padding-inline: var(--space-1);
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

		/* Tapping the bar expands the deck on mobile — hide the duplicate */
		.expand {
			display: none;
		}
	}

	/* Mini player: channel + track + play on one row, progress below, times
	   hidden. Hidden via CSS only — everything stays in the DOM. Above
	   1024px: the full desktop bar. */
	@media (max-width: 1024px) {
		.deck-compact-bar :global(.progress time) {
			display: none;
		}

		.track-panel :global(.popover-menu) {
			display: none;
		}

		.controls-center > :global(*:not(.play)) {
			display: none;
		}
	}

	@media (min-width: 768px) {
		.controls {
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
