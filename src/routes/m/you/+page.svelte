<section class="m-screen">
	<h1>You</h1>
	<p>Placeholder profile tab for the mobile prototype nav.</p>

	<ul class="m-cards">
		<li>
			<strong>Your radios</strong>
			<span>Not wired — scaffold only</span>
		</li>
		<li>
			<strong>Listening history</strong>
			<span>Not wired — scaffold only</span>
		</li>
		<li>
			<strong>Settings</strong>
			<span>Use the main app for real settings</span>
		</li>
	</ul>
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

	.m-cards {
		list-style: none;
		margin: 0.35rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.55rem;
	}

	.m-cards li {
		display: grid;
		gap: 0.2rem;
		min-height: var(--m-tap, 48px);
		padding: 0.9rem 1rem;
		border-radius: 0.85rem;
		background: var(--m-surface, #1a222c);
		border: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
	}

	.m-cards strong {
		font-weight: 650;
	}

	.m-cards span {
		color: var(--m-muted, #9aa3ad);
		font-size: 0.9rem;
	}
</style>
