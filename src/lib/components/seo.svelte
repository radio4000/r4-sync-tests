<script>
	import {appName} from '$lib/config'
	let {title, description = undefined, image = undefined, url = undefined, type = 'website', plain = false} = $props()
</script>

<svelte:head>
	<title>{plain ? title : `${title} | ${appName}`}</title>
	<meta property="og:site_name" content={appName} />
	<meta property="og:title" content={title} />
	<meta property="og:type" content={type} />
	{#if url}<meta property="og:url" content={url} />{/if}
	{#if description}
		<meta name="description" content={description} />
		<meta property="og:description" content={description} />
	{/if}
	{#if image}<meta property="og:image" content={image} />{/if}
</svelte:head>
