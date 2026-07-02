<script>
	import {untrack, tick} from 'svelte'
	import {createAttachmentKey} from 'svelte/attachments'

	/** @type {{children?: import('svelte').Snippet, trigger?: import('svelte').Snippet, btnClass?: string, closeOnClick?: boolean, onclose?: () => void, triggerAttachment?: Function, align?: 'left' | 'right' | 'end', valign?: 'top' | 'bottom', centered?: boolean, [key: string]: any}} */
	let {
		children,
		trigger,
		btnClass,
		closeOnClick = true,
		onclose,
		triggerAttachment,
		align = 'left',
		valign = 'bottom',
		centered = false,
		...rest
	} = $props()

	const id = $props.id()

	const triggerProps = $derived({
		...(triggerAttachment ? {[createAttachmentKey()]: triggerAttachment} : {}),
		...(btnClass ? {class: btnClass} : {})
	})

	let buttonEl = $state()
	let popoverEl = $state()
	let hasBeenOpened = $state(false)

	export function close() {
		popoverEl?.hidePopover()
	}

	function positionPopover(el) {
		if (!buttonEl) return
		// Centered mode: let CSS handle placement (see [popover].centered).
		if (centered) {
			el.style.top = ''
			el.style.left = ''
			return
		}
		const rect = buttonEl.getBoundingClientRect()
		const popoverRect = el.getBoundingClientRect()
		const isRTL = document.documentElement.dir === 'rtl'
		const resolvedAlign = align === 'end' ? (isRTL ? 'left' : 'right') : align
		const left =
			resolvedAlign === 'right'
				? Math.max(8, rect.right - popoverRect.width)
				: Math.min(rect.left, window.innerWidth - popoverRect.width - 8)
		// Flip above the trigger when there isn't room below (e.g. a trigger
		// pinned near the bottom of the viewport, like the mobile header).
		const spaceBelow = window.innerHeight - rect.bottom
		const spaceAbove = rect.top
		const opensUp = valign === 'top' || (spaceBelow < popoverRect.height + 8 && spaceAbove > spaceBelow)
		const top = opensUp
			? Math.max(8, rect.top - popoverRect.height - 4)
			: Math.min(rect.bottom + 4, window.innerHeight - popoverRect.height - 8)
		el.style.top = `${top}px`
		el.style.left = `${Math.max(8, left)}px`
	}

	// Position popover below button and optionally close on action click
	$effect(() => {
		if (!popoverEl) return
		const el = untrack(() => popoverEl)

		const handleToggle = async (e) => {
			if (e.newState === 'closed') {
				onclose?.()
				return
			}
			if (!hasBeenOpened) {
				hasBeenOpened = true
				await tick()
			}
			positionPopover(el)
		}

		const handleClick = (e) => {
			if (!closeOnClick) return

			const target = e.target
			// Don't close if this is the trigger button
			if (target.hasAttribute('popovertarget')) return

			// Find the clicked interactive element
			const clickedElement = target.closest('button, a')
			if (!clickedElement) return

			// Don't close if the element has data-no-close attribute
			if (clickedElement.hasAttribute('data-no-close')) return

			// Close the popover when clicking buttons/links inside
			el.hidePopover()
		}

		el.addEventListener('toggle', handleToggle)
		el.addEventListener('click', handleClick)
		return () => {
			el.removeEventListener('toggle', handleToggle)
			el.removeEventListener('click', handleClick)
		}
	})
</script>

<div class="popover-menu" {...rest}>
	<button type="button" popovertarget={id} bind:this={buttonEl} {...triggerProps}>
		{@render trigger?.()}
	</button>
	<div popover="auto" {id} class:centered bind:this={popoverEl}>
		{#if hasBeenOpened}
			{@render children?.()}
		{/if}
	</div>
</div>

<style>
	.popover-menu {
		position: relative;
	}

	[popover] {
		position: fixed;
		margin: 0;
		padding: var(--space-1);
		min-width: 10rem;
		background: var(--color-interface-elevated);
		border: 1px solid var(--color-interface-border);
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-modal);
	}

	/* Centered sheet (opt-in via the `centered` prop). */
	[popover].centered {
		top: 3.25rem;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100vw - 2rem);
		max-width: 26rem;
	}
</style>
