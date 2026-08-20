<script>
	let {children} = $props()
</script>

<!-- Auth screens are per-visitor, not content. Every channel/track page links here
     with a `?redirect=` param, so crawlers otherwise find one near-identical URL per
     page ("Duplicate without user-selected canonical" in Search Console).
     `follow` so the crawler still walks back out to the linked pages.
     No canonical: pointing a noindexed URL at another URL can spread the noindex. -->
<svelte:head>
	<meta name="robots" content="noindex, follow" />
</svelte:head>

{@render children()}
