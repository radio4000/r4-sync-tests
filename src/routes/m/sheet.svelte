<script>
	import {fly, fade} from 'svelte/transition'
	import Icon from '$lib/components/icon.svelte'

	/**
	 * @typedef {Object} Props
	 * @property {boolean} open
	 * @property {string} [title]
	 * @property {() => void} [onclose]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	const {open = false, title = 'Menu', onclose, children} = $props()

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
			transition:fly={{y: 28, duration: 240}}
		>
			<header class="m-sheet-head">
				<button type="button" class="m-sheet-close" onclick={close} aria-label="Close">
					<Icon icon="close" />
				</button>
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
		background: color-mix(in oklab, var(--gray-12) 28%, transparent);
		cursor: pointer;
	}

	.m-sheet {
		position: relative;
		z-index: 1;
		width: 100%;
		height: min(92dvh, 100%);
		max-height: min(92dvh, 100%);
		margin-inline: 0;
		display: flex;
		flex-direction: column;
		background: var(--gray-2);
		color: var(--gray-12);
		border-radius: 1.25rem 1.25rem 0 0;
		border: 1px solid var(--color-interface-border);
		border-bottom: 0;
		box-shadow: var(--shadow-modal);
		overflow: hidden;
	}

	.m-sheet-head {
		display: flex;
		align-items: center;
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-3);
		flex-shrink: 0;
	}

	.m-sheet-close {
		width: 2.5rem;
		height: 2.5rem;
		min-width: 2.5rem;
		min-height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--gray-3);
		color: var(--gray-12);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.m-sheet-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: 0 var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
	}
</style>
