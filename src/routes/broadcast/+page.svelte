<script>
	import {pg} from '$lib/db'
	import {subscribeToAppState} from '$lib/api'

	/** @type {import('$lib/types').AppState} */
	let appState = $state({})
	/** @type {import('$lib/types').Track|undefined} */
	let currentTrack = $state()
	/** @type {import('$lib/types').Channel|undefined} */
	let currentChannel = $state()

	const channelId = $derived(appState.channels?.[0])

	subscribeToAppState(async (state) => {
		appState = state

		if (channelId) {
			const {rows} = await pg.sql`SELECT * FROM channels WHERE id = ${channelId}`
			currentChannel = rows[0]
		} else {
			currentChannel = undefined
		}

		if (appState.playlist_track) {
			const {rows} = await pg.sql`SELECT * FROM tracks WHERE id = ${appState.playlist_track}`
			currentTrack = rows[0]
		}
	})
</script>

<section>
	<p>Broadcast what you're listening to.</p>

	{#if channelId}
		{#if currentTrack && currentChannel}
			<p>You are ready to start broadacsting. Use the controls in the header.</p>
			<p>Anyone can listen in to your broadcast.</p>
		{:else}
			<p>No track currently playing. Go to the <a href="/">home page</a> to start a track first.</p>
		{/if}
	{:else}
		<p><a href="/login">Sign in</a> to start broadcasting.</p>
	{/if}
</section>

<style>
	section {
		margin: 0.5rem;
	}
</style>
