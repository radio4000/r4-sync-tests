<script>
	let {data} = $props()
</script>

<svelte:head>
	<title>{data.slug} - Radio4000 docs</title>
</svelte:head>

<!-- eslint-disable svelte/no-at-html-tags -->
<article>
	{@html data.html}
</article>
