<script>
	import {fly, fade} from 'svelte/transition'

	/**
	 * @typedef {Object} Props
	 * @property {boolean} open
	 * @property {string} [title]
	 * @property {() => void} [onclose]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	const {open = false, title = 'Sheet', onclose, children} = $props()

	function close() {
		onclose?.()
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		if (event.key === 'Escape') close()
	}
</script>

{#if open}
	<div class="m-sheet-root" role="presentation" onkeydown={onKeydown}>
		<button
			type="button"
			class="m-sheet-backdrop"
			aria-label="Dismiss"
			onclick={close}
			transition:fade={{duration: 160}}
		></button>

		<div
			class="m-sheet"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:fly={{y: 40, duration: 220}}
		>
			<header class="m-sheet-head">
				<div class="m-sheet-handle" aria-hidden="true"></div>
				<div class="m-sheet-title-row">
					<h2>{title}</h2>
					<button type="button" class="m-sheet-close" onclick={close}>Done</button>
				</div>
			</header>
			<div class="m-sheet-body">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

<style>
	.m-sheet-root {
		position: fixed;
		inset: 0;
		z-index: 1100;
		display: grid;
		align-items: end;
	}

	.m-sheet-backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		margin: 0;
		background: color-mix(in oklab, #000 55%, transparent);
		cursor: pointer;
	}

	.m-sheet {
		position: relative;
		z-index: 1;
		width: min(100%, 32rem);
		max-height: min(78dvh, 36rem);
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		background: var(--m-surface, #1a222c);
		color: var(--m-ink, #f2efe8);
		border-radius: 1.1rem 1.1rem 0 0;
		border: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
		border-bottom: 0;
		box-shadow: 0 -12px 40px color-mix(in oklab, #000 35%, transparent);
		overflow: hidden;
	}

	.m-sheet-head {
		padding: 0.65rem 1rem 0.5rem;
		border-bottom: 1px solid var(--m-line, color-mix(in oklab, #f2efe8 12%, transparent));
	}

	.m-sheet-handle {
		width: 2.5rem;
		height: 0.28rem;
		margin: 0 auto 0.65rem;
		border-radius: 999px;
		background: color-mix(in oklab, var(--m-ink, #f2efe8) 28%, transparent);
	}

	.m-sheet-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.m-sheet-title-row h2 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.m-sheet-close {
		min-height: var(--m-tap, 48px);
		min-width: var(--m-tap, 48px);
		padding: 0 0.85rem;
		border: 0;
		border-radius: 0.65rem;
		background: color-mix(in oklab, var(--m-accent, #3ecf8e) 18%, transparent);
		color: var(--m-ink, #f2efe8);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.m-sheet-body {
		padding: 1rem;
		overflow: auto;
		overscroll-behavior: contain;
	}
</style>
