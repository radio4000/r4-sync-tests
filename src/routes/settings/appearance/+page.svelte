<script>
	import ThemeEditor from '$lib/components/theme-editor.svelte'
	import {resolve} from '$app/paths'
	import BackLink from '$lib/components/back-link.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.settings_appearance_title()}</title>
</svelte:head>

<article>
	<div class="focused constrained">
		<header>
			<BackLink href={resolve('/settings')} />
			<h1>{m.theme_heading()}</h1>
		</header>
	</div>
	<main>
		<ThemeEditor />
	</main>
</article>
