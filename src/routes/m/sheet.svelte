<script>
	import {fly, fade} from 'svelte/transition'
	import Icon from '$lib/components/icon.svelte'

	/** @type {{open?: boolean, title?: string, onclose?: () => void, children?: import('svelte').Snippet}} */
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
			<header class="m-bar">
				<button type="button" class="m-ctrl" onclick={close} aria-label="Close">
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

	.m-sheet-backdrop,
	.m-sheet-backdrop:is(:hover, :focus, :active) {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		margin: 0;
		background: oklch(0 0 0 / 0.45);
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
		scale: 1;
	}

	.m-sheet {
		position: relative;
		z-index: 1;
		width: 100%;
		height: min(92dvh, 100%);
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

	.m-sheet > .m-bar {
		background: transparent;
		border-bottom: 0;
	}

	.m-sheet-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: 0 var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
	}
</style>
