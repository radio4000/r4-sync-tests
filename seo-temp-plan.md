# Potential search improvements

> AI-generated. Findings came from Claude auditing the server-rendered HTML of
> `https://radio4000.com/ko002` against the source in `src/routes/[slug]/`.
> Nothing here is verified beyond that audit — review each item before acting on it.
> Temporary file, delete once the items are triaged.

## What already works

The `<head>` is in good shape. `src/lib/components/seo.svelte` emits `<title>`,
`meta description`, the `og:*` set, `link rel=canonical`, and the channel page adds an
RSS `alternate`. SSR ships real content — all 50 track titles, the channel bio, the tag
links — rather than an empty shell. `robots.txt` and `sitemap.xml` (1145 channel URLs)
are served. Document order is already sensible: site header → h1 → channel nav → bio →
tracklist → footer.

So the gaps below are refinements, not a rescue.

---

## 1. Tracks have no crawlable URLs

The channel page renders 256 anchors. 204 point at `/ko002/tracks?tags=…`, and 14 point
at `/ko002/tracks/<tid>/discogs` — the Discogs icon from `track-card.svelte:217`, which
only appears on tracks that have a `discogs_url`. Zero point at the track page itself.

So the deep route is already reachable, but only via a sub-route, only for the 28% of
tracks with Discogs metadata, and behind an unlabelled icon.

The `/[slug]/tracks/[tid]` route exists. `track-card.svelte:194` already has the
plumbing — a `linkTitleToTrack` prop that wraps the `<h3>` in `<a href={permalink}>`:

```svelte
{#if linkTitleToTrack && isRealTrack && !appState.embed_mode}
	<a href={permalink}>{track.title}</a>
{:else}
	{track.title}
{/if}
```

Only `player.svelte:620,635` passes it. `tracklist.svelte` never does, so the channel
page and the tracks page both render 50 titles that go nowhere.

Fifty pieces of unique, human-curated music metadata per channel with no destination —
this is the largest single lever on the list.

Open question: linking the title changes click behaviour on the row (today the title is
a `locatable` click target via `onLocate`). Needs a decision about what a title click
should do before this can just be flipped on.

## 2. `<html lang="%lang%">` ships raw in SSR

`src/app.html:3` uses a `%lang%` placeholder. The comment above it says SvelteKit
replaces it at runtime, but SvelteKit only substitutes `%sveltekit.*%` — a custom
placeholder needs `transformPageChunk`, and the one in `src/hooks.server.ts:22` only
injects the fallback title/description.

The client corrects it during hydration, so it only looks wrong to non-executing
clients: crawlers, scrapers, preview bots. Fix is a line in the existing hook.

## 3. Two `<main>` elements

The root `+layout.svelte` renders a `<main>`, and `src/routes/[slug]/+layout.svelte`
renders another one nested inside it. Invalid HTML, and it leaves the main-content
landmark ambiguous for both crawlers and screen readers.

One of them should become a plain `<div>`. The inner one is the better `<main>` — it
wraps the actual channel content, while the outer wraps chrome too.

## 4. Modal dialogs are the first thing in the body

Three `<dialog>` elements are server-rendered before the site header: "Edit track",
"Share channel", and "Keyboard shortcuts" (the last one with its full `<dl>` of every
binding). Each carries an `<h2>`.

So the first three headings in the document are UI chrome, and they outrank the channel
`<h1>` in source order.

Move them to the end of the body, or skip SSR for them entirely — they're all
interaction-only.

## 5. Heading level jumps h1 → h3, and sections are unnamed

The channel name is `<h1>`, track titles are `<h3>`, nothing in between.

Separately, none of the `<section>` elements carry an accessible name —
`section.track-section` and `section.content` are both bare. An unnamed `<section>` is
not exposed as a region at all, so the tracklist has no navigable landmark.

Both are fixed by the same change: add an `<h2>` per section (visually hidden is fine)
and point the section at it with `aria-labelledby`. That's better than a bare
`aria-label`, since it also fills the heading gap. The tracklist's current
`aria-label="Tracks"` on the `<ul>` can then be dropped.

Candidate headings: "About" for the bio block, "Tracks" for the list, "Related" for the
common-follows section.

## 6. `role="listbox"` / `role="option"` on the tracklist

`tracklist.svelte:262,303` sets `role="listbox"` on the `<ul>` and `role="option"` on
each `<li>`. Under ARIA, an `option` is a name-only widget: its children are flattened
to a text label. Everything inside a track row — the play button, the tag links, the
`<time>`, the context menu, and any future track permalink — is invisible to assistive
tech. It also discards the list semantics that `<ul>/<li>` gave for free.

This directly blocks item 1: adding a link inside a `role="option"` is a dead link for
AT users.

Replace with plain `<ul>/<li>` (or `role="list"`) and drive keyboard navigation with
roving `tabindex` on the rows.

## 7. No structured data anywhere

No JSON-LD on the page. A channel page is, semantically, a playlist, and says so
nowhere machine-readable.

Worth adding:

- `MusicPlaylist` with `track: [MusicRecording]` — title, artist where known, `url` once
  item 1 lands
- `BreadcrumbList` for the channel → section hierarchy
- possibly `Person`/`Organization` for the channel itself

Highest-leverage addition after item 1, and it composes with it: the schema wants track
URLs that don't exist yet.

Use JSON-LD, not microdata (`itemscope`/`itemprop`). Google documents JSON-LD as its
preferred format, and it keeps the schema in one auditable block instead of threading
`itemprop` attributes through `+page.svelte` and `track-card.svelte` — where the track
card is shared with the player, the deck, and embeds, all of which would inherit the
markup whether or not it's correct in that context.

## 8. Missing head tags

- `twitter:card` (`summary_large_image`) — no Twitter/X card at all today
- `og:image:width`, `og:image:height`, `og:image:alt`
- `<meta name="robots" content="max-image-preview:large">`
- `og:image:secure_url`

All belong in `seo.svelte` alongside the existing tags.

`og:type` is currently `music.radio_station`. That is a real OGP type and arguably the
most accurate one for a channel, so leaving it is defensible. Don't change it expecting
rich results — Google reads schema.org, not `og:type`, so item 7 is what moves that
needle.

Worth a proper look first: the OGP music vertical defines structured properties this
site has the data for, and we currently emit none of them.

- <https://ogp.me> — the `music.*` section of the spec
- <https://developers.facebook.com/docs/opengraph/music/> — Facebook's music stories

Sketch of what's available, to be verified against the specs before implementing:

- `music.radio_station` (current) defines essentially nothing beyond the base type.
- `music.playlist` adds `music:song` (repeatable, pointing at a `music.song` URL),
  `music:song:track` (position), and `music:creator` (a profile URL). A channel maps
  onto this cleanly — once item 1 gives each track a URL for `music:song` to reference.
- `music.song` on the track pages themselves adds `music:duration`, `music:album`,
  `music:musician`.

Note both the ordering dependency (music tags want track URLs, same as item 7) and the
overlap: `music:song` and schema.org `MusicPlaylist.track` describe the same relation
for different consumers, so they should be built from one source, not two.

## 9. Track artwork: alt text and lazy loading

`track-card.svelte:186` sets `alt={track.title}`, duplicating the adjacent `<h3>`. A
screen reader announces the title twice. The image is decorative here — the wrapping
button already has `title="Play"` — so `alt=""` is correct.

`track-card.svelte:188` also gates lazy loading on `index > 20`, which leaves 21 eager
images above the fold on every channel page.

## 10. `<time>` carries no `datetime`

`track-card.svelte:208` renders a `<time>` element containing an arrow glyph and some
buttons, never a date. Emitting `<time datetime={track.created_at}>` costs nothing and
makes the tracklist's chronology machine-readable.

## 11. Sitemap is channels-only

`src/routes/sitemap.xml` lists 1145 channel roots and nothing else. No `/explore`,
`/tags`, no channel subpages, no track permalinks, and no `lastmod` beyond the channel
level.

Once item 1 lands, track URLs belong here too — which means a sitemap index, since
50,000 URLs per file is the cap.

## 12. Channel avatar is lazy-loaded

`src/lib/components/channel-avatar.svelte:16` hardcodes `loading="lazy"`. On a channel
page that avatar is the hero image and the likely LCP element, so lazy loading defers
the one image that decides the score.

The component is shared (cards, lists, follower grids) where lazy is correct, so this
wants a prop — something like `priority` — that the channel header opts into with
`loading="eager" fetchpriority="high"`, leaving every other call site as-is.

---

## Suggested order

1. Items 2 and 3 — small, independent, no design decisions.
2. Item 4 — move or drop the SSR'd dialogs.
3. Items 6 then 1 — fix the roles first, then add the track links they'd otherwise break.
4. Items 5, 8, 9, 10, 12 — small semantic and metadata cleanups, batchable.
5. Items 7 and 11 — both want track URLs to exist first.

---

## Considered and dropped

A second pass suggested a few things that don't survive checking the rendered HTML:

- _"The page has no headings below `<h1>` — nothing but `<p>`, `<small>`, `<a>`,
  `<article>`."_ Not true: the page renders 50 `<h3>` track titles. The real defect is
  the level jump, which is item 5.
- _`aria-label` on the track-section `<footer>`._ It contains one "See all 50 tracks"
  link. A label would be noise.
- _`aria-label="Channel header"` on the channel `<header>`._ That element sits inside
  `<main>`, so it is not a banner landmark and the label wouldn't surface as one. The
  premise that it's the only non-global `<header>` is also wrong — each of the three
  SSR'd dialogs has one (item 4).
- _Wrapping the channel bio in a `<header>` inside `<article>`._ Nothing is gained that
  the heading in item 5 doesn't already give.
