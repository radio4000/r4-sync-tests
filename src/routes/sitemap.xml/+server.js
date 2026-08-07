import {sdk} from '@radio4000/sdk'

// Channels with fewer tracks than this are left out — an empty radio is not worth indexing.
const MIN_TRACK_COUNT = 10
// Supabase caps rows per request, so we page through the view until it runs dry.
const PAGE_SIZE = 1000
const SITE_URL = 'https://radio4000.com'

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	/** @type {{slug: string | null; latest_track_at: string | null}[]} */
	const channels = []

	for (let from = 0; ; from += PAGE_SIZE) {
		const {data, error} = await sdk.supabase
			.from('channels_with_tracks')
			.select('slug, latest_track_at')
			.gte('track_count', MIN_TRACK_COUNT)
			.order('slug', {ascending: true})
			.range(from, from + PAGE_SIZE - 1)

		// Better to fail loudly than to tell Google we have nothing.
		if (error) return new Response(`Failed to build sitemap: ${error.message}`, {status: 500})
		if (!data?.length) break
		channels.push(...data)
		if (data.length < PAGE_SIZE) break
	}

	const urls = channels
		.filter((c) => c.slug)
		.map((c) => {
			// Slugs can hold non-ASCII (and even emoji), which <loc> wants percent-encoded.
			// It also encodes everything XML would need escaped, so no escaping here.
			const loc = `<loc>${SITE_URL}/${encodeURIComponent(c.slug ?? '')}</loc>`
			const lastmod = c.latest_track_at
				? `<lastmod>${c.latest_track_at.slice(0, 10)}</lastmod>`
				: ''
			return `\t<url>${loc}${lastmod}</url>`
		})
		.join('\n')

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, s-maxage=86400'
		}
	})
}
