<script>
	import {appName} from '$lib/config'
	import Channels from '$lib/components/channels.svelte'
	import Seo from '$lib/components/seo.svelte'
	import * as m from '$lib/paraglide/messages'

	const {data} = $props()
</script>

<Seo title={m.explore_title({appName})} plain />

<Channels filter={data.filter} filterBasePath="/explore/channels" searchHref="/search/channels" />
