<script>
	import ThemeEditor from '$lib/components/theme-editor.svelte'
	import {resolve} from '$app/paths'
	import BackLink from '$lib/components/back-link.svelte'
	import Seo from '$lib/components/seo.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<Seo title={m.settings_appearance_title()} plain />

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
