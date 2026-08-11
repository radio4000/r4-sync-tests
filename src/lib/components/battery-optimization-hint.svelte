<script>
	import {appState} from '$lib/app-state.svelte'
	import {backgroundStall} from '$lib/background-stall.svelte'
	import {isAndroid} from '$lib/utils'
	import * as m from '$lib/paraglide/messages'

	// Android only: this is specifically about Android's background battery
	// management, which doesn't apply to iOS (a separate, unfixable WebKit bug
	// covers that platform) or desktop.
	const visible = $derived(
		isAndroid() && backgroundStall.detected && !appState.battery_hint_dismissed
	)
</script>

{#if visible}
	<div data-battery-hint role="status">
		<strong>{m.battery_hint_title()}</strong>
		<p>
			{m.battery_hint_body()}
			<a href="https://dontkillmyapp.com" target="_blank" rel="noreferrer"
				>{m.battery_hint_link()}</a
			>.
		</p>
		<menu>
			<button onclick={() => (appState.battery_hint_dismissed = true)}
				>{m.battery_hint_dismiss()}</button
			>
		</menu>
	</div>
{/if}

<style>
	[data-battery-hint] {
		max-width: 50ch;
		position: fixed;
		bottom: var(--space-1);
		right: var(--space-1);
		z-index: 9999;
		display: flex;
		flex-flow: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--accent-3);
		border: 1px solid var(--accent-6);
		border-radius: var(--border-radius);
	}

	[data-battery-hint] p {
		margin: 0;
	}
</style>
