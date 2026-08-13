<script>
	import {resolve} from '$app/paths'
	import Sheet from './sheet.svelte'

	let sheetOpen = $state(false)
</script>

<section class="m-home">
	<p class="m-kicker">Prototype</p>
	<h1>Listen like an app</h1>
	<p class="m-lead">
		Throwaway mobile shell — sheets, fixed nav, no decks. Open from
		<code>/m</code>. Delete this folder when done.
	</p>

	<div class="m-actions">
		<button type="button" class="m-btn m-btn-primary" onclick={() => (sheetOpen = true)}>
			Open sheet
		</button>
		<a class="m-btn" href={resolve('/m/search')}>Search radios</a>
	</div>

	<ul class="m-list">
		<li>
			<strong>Home</strong>
			<span>You are here</span>
		</li>
		<li>
			<strong>Search</strong>
			<span>Placeholder destination</span>
		</li>
		<li>
			<strong>You</strong>
			<span>Placeholder destination</span>
		</li>
	</ul>
</section>

<Sheet open={sheetOpen} title="Quick actions" onclose={() => (sheetOpen = false)}>
	<p>Bottom sheet example — tap the dimmed overlay, Done, or Escape to dismiss.</p>
	<ul class="m-sheet-list">
		<li>Start a radio</li>
		<li>Add a track</li>
		<li>Share this channel</li>
	</ul>
</Sheet>

<style>
	.m-home {
		display: grid;
		gap: 1rem;
		max-width: 28rem;
	}

	.m-kicker {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--m-muted, #9aa3ad);
	}

	h1 {
		margin: 0;
		font-size: clamp(1.8rem, 6vw, 2.35rem);
		line-height: 1.05;
		letter-spacing: -0.03em;
		font-weight: 700;
	}

	.m-lead {
		margin: 0;
		color: var(--m-muted, #9aa3ad);
		line-height: 1.45;
	}

	.m-lead code {
		font-size: 0.9em;
		color: var(--m-ink, #f2efe8);
	}

	.m-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}

	.m-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--m-tap, 48px);
		padding: 0.7rem 0.9rem;
		border-radius: 0.8rem;
		border: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
		background: var(--m-surface, #1a222c);
		color: var(--m-ink, #f2efe8);
		font: inherit;
		font-weight: 650;
		text-decoration: none;
		cursor: pointer;
	}

	.m-btn-primary {
		border-color: transparent;
		background: var(--m-accent, #3ecf8e);
		color: #07140f;
	}

	.m-list {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		border: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
		border-radius: 0.9rem;
		overflow: hidden;
		background: var(--m-surface, #1a222c);
	}

	.m-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: baseline;
		min-height: var(--m-tap, 48px);
		padding: 0.85rem 1rem;
		border-top: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
	}

	.m-list li:first-child {
		border-top: 0;
	}

	.m-list strong {
		font-weight: 650;
	}

	.m-list span {
		color: var(--m-muted, #9aa3ad);
		font-size: 0.9rem;
	}

	.m-sheet-list {
		margin: 0.75rem 0 0;
		padding-left: 1.1rem;
		color: var(--m-muted, #9aa3ad);
		line-height: 1.6;
	}
</style>
