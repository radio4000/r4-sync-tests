<script>
	let query = $state('')
</script>

<section class="m-screen">
	<h1>Search</h1>
	<p>Placeholder screen — nav destination only.</p>

	<label class="m-field">
		<span>Find a radio</span>
		<input
			type="search"
			placeholder="slug, mood, city…"
			bind:value={query}
			autocomplete="off"
		/>
	</label>

	{#if query.trim()}
		<p class="m-hint">No live results in this lab. You typed “{query.trim()}”.</p>
	{:else}
		<p class="m-hint">Type something to feel the large tap field.</p>
	{/if}
</section>

<style>
	.m-screen {
		display: grid;
		gap: 0.85rem;
		max-width: 28rem;
	}

	h1 {
		margin: 0;
		font-size: 1.6rem;
		letter-spacing: -0.03em;
	}

	p {
		margin: 0;
		color: var(--m-muted, #9aa3ad);
		line-height: 1.45;
	}

	.m-field {
		display: grid;
		gap: 0.4rem;
		margin-top: 0.35rem;
	}

	.m-field span {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--m-muted, #9aa3ad);
	}

	.m-field input {
		min-height: var(--m-tap, 48px);
		padding: 0.75rem 0.9rem;
		border-radius: 0.8rem;
		border: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
		background: var(--m-surface, #1a222c);
		color: var(--m-ink, #f2efe8);
		font: inherit;
		outline: none;
	}

	.m-field input:focus {
		border-color: var(--m-accent, #3ecf8e);
	}

	.m-hint {
		font-size: 0.9rem;
	}
</style>
