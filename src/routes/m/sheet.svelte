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
					<button type="button" class="m-circle" onclick={close} aria-label="Done">
						Done
					</button>
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
		background: color-mix(in oklab, var(--gray-12) 35%, transparent);
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
		background: var(--color-interface-elevated);
		color: var(--gray-12);
		border-radius: 1.1rem 1.1rem 0 0;
		border: 1px solid var(--color-interface-border);
		border-bottom: 0;
		box-shadow: var(--shadow-modal);
		overflow: hidden;
	}

	.m-sheet-head {
		padding: var(--space-2) var(--space-3) var(--space-2);
		border-bottom: 1px solid var(--color-interface-border);
	}

	.m-sheet-handle {
		width: 2.5rem;
		height: 0.28rem;
		margin: 0 auto var(--space-2);
		border-radius: 999px;
		background: var(--gray-6);
	}

	.m-sheet-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.m-sheet-title-row h2 {
		margin: 0;
		font-size: var(--font-6);
		font-weight: 650;
	}

	.m-circle {
		min-height: 2.5rem;
		padding: 0 var(--space-3);
		border: 0;
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-12);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.m-sheet-body {
		padding: var(--space-3);
		overflow: auto;
		overscroll-behavior: contain;
	}
</style>
