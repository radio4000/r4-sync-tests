<script>
	import Icon from '$lib/components/icon.svelte'
	import ButtonFeedback from '$lib/components/button-feedback.svelte'
	import Tag from '$lib/components/tag.svelte'
	import AutoRadioButton from '$lib/components/auto-radio-button.svelte'

	let active = $state(false)
</script>

<svelte:head>
	<title>Buttons & inputs — Radio4000 docs</title>
</svelte:head>

<h1>Buttons & inputs</h1>
<p>
	<small
		>Controls from <code>buttons.css</code> and <code>forms.css</code>. Compare surface, border,
		height and focus across both families.</small
	>
</p>

<section>
	<h2>Buttons + inputs together</h2>
	<p>
		<small
			>Same row, <code>align-items: center</code> — check heights, surfaces and edges line up.</small
		>
	</p>
	<div class="row pair">
		<button>Button</button>
		<input type="text" value="Text input" />
		<select>
			<option>Select</option>
			<option>Option B</option>
			<option>Option C</option>
			<option>Option D</option>
		</select>
		<button class="primary">Primary</button>
	</div>
	<div class="row pair">
		<input type="search" placeholder="Search…" />
		<button><Icon icon="search" /></button>
		<button>Go</button>
	</div>
	<div class="row pair">
		<input type="text" value="With submit" />
		<button type="submit">Submit</button>
	</div>
	<div class="row pair">
		<input type="text" disabled value="Disabled field" />
		<button disabled>Disabled</button>
		<select disabled>
			<option>Disabled select</option>
			<option>Option B</option>
			<option>Option C</option>
		</select>
	</div>
	<p>
		<small
			>Watch the surface, border and horizontal padding — they should read as one family at the same
			height.</small
		>
	</p>
</section>

<section>
	<h2>Inputs</h2>
	<form class="form" onsubmit={(e) => e.preventDefault()}>
		<fieldset>
			<label for="i-text">Text</label>
			<input id="i-text" type="text" placeholder="Placeholder text" />
		</fieldset>
		<fieldset>
			<label for="i-search">Search</label>
			<input id="i-search" type="search" placeholder="Search…" />
		</fieldset>
		<fieldset>
			<label for="i-number">Number</label>
			<input id="i-number" type="number" value="42" />
		</fieldset>
		<fieldset>
			<label for="i-textarea">Textarea</label>
			<textarea id="i-textarea" rows="2" placeholder="Write something…"></textarea>
		</fieldset>
		<fieldset>
			<label for="i-select">Select</label>
			<select id="i-select">
				<option>Option A</option>
				<option>Option B</option>
			</select>
		</fieldset>
		<fieldset class="row">
			<label><input type="checkbox" checked /> Checkbox</label>
			<label><input type="radio" name="ir" checked /> Radio A</label>
			<label><input type="radio" name="ir" /> Radio B</label>
		</fieldset>
		<fieldset>
			<label for="i-range">Range</label>
			<input id="i-range" type="range" min="0" max="100" value="40" />
		</fieldset>
		<fieldset>
			<label for="i-disabled">Disabled</label>
			<input id="i-disabled" type="text" disabled value="Disabled input" />
		</fieldset>
	</form>
	<p>
		<small>Click a field to see the focus ring (<code>2px accent-9</code>) — same as buttons.</small
		>
	</p>
</section>

<section>
	<h2>Base</h2>
	<div class="row">
		<button>Default</button>
		<button disabled>Disabled</button>
		<a class="btn" href="#a">Link .btn</a>
		<button type="submit">Submit</button>
	</div>
</section>

<section>
	<h2>Variants</h2>
	<div class="row">
		<button class="primary">Primary</button>
		<button class="danger">Danger</button>
		<button class="ghost">Ghost</button>
		<button class="link">Link</button>
		<button class="chip">Chip</button>
	</div>
</section>

<section>
	<h2>Active state</h2>
	<div class="row">
		<button class="active">Default active</button>
		<button class="primary active">Primary active</button>
		<button class="chip active">Chip active</button>
	</div>
	<div class="row">
		<button class:active onclick={() => (active = !active)}>
			Toggle ({active ? 'on' : 'off'})
		</button>
	</div>
</section>

<section>
	<h2>With icons</h2>
	<div class="row">
		<button><Icon icon="add" /> Add</button>
		<button class="primary"><Icon icon="play-fill" /> Play</button>
		<button class="danger"><Icon icon="delete" /> Delete</button>
		<button class="ghost"><Icon icon="settings" /></button>
		<button class="chip"><Icon icon="tag" /> Tag</button>
	</div>
</section>

<section>
	<h2>Icon-only</h2>
	<p>
		<small
			>No special class — a bare <code>button</code> with just an <code>&lt;Icon&gt;</code> is
			square by default (<code>min-width</code>/<code>min-height: 2rem</code>). Use
			<code>.ghost</code> to drop the background.</small
		>
	</p>
	<div class="row">
		<button><Icon icon="close" /></button>
		<button><Icon icon="search" /></button>
		<button class="ghost"><Icon icon="settings" /></button>
		<button class="ghost"><Icon icon="options-horizontal" /></button>
		<button disabled><Icon icon="delete" /></button>
	</div>
</section>

<section>
	<h2>Loading</h2>
	<div class="row">
		<button data-loading="true" disabled>Loading…</button>
	</div>
</section>

<section>
	<h2>Auto radio (<code>&lt;AutoRadioButton&gt;</code> / <code>.auto-live-btn</code>)</h2>
	<p>
		<small
			>Infinite-icon button for auto-radio. Idle is a plain button; <code>live</code> turns it
			active; <code>drifted</code> drops it back to a resync call-to-action. A <code>count</code>
			above 1 shows a listener badge in the corner.</small
		>
	</p>
	<div class="row">
		<AutoRadioButton title="Idle" />
		<AutoRadioButton live title="Live" />
		<AutoRadioButton live drifted title="Drifted (resync)" />
		<AutoRadioButton live count={3} title="Live with listeners" />
	</div>
</section>

<section>
	<h2>ButtonFeedback</h2>
	<div class="row">
		<ButtonFeedback onclick={() => new Promise((r) => setTimeout(r, 600))}
			>Click me (success)</ButtonFeedback
		>
		<ButtonFeedback onclick={() => new Promise((_, r) => setTimeout(r, 600))} error="Oops">
			Click me (error)
		</ButtonFeedback>
		<ButtonFeedback class="primary" onclick={() => new Promise((r) => setTimeout(r, 600))}>
			Primary feedback
		</ButtonFeedback>
	</div>
</section>

<section>
	<h2>Tabs (<code>.tabs</code>)</h2>
	<p><small>Simple buttons</small></p>
	<nav class="tabs">
		<button class="active">Tab 1</button>
		<button>Tab 2</button>
		<button>Tab 3</button>
	</nav>

	<p><small>Links with icons (<code>div.tabs &gt; nav &gt; a</code>)</small></p>
	<div class="tabs">
		<nav>
			<a href="#a" class="active"><Icon icon="circle-info" /> Info</a>
			<a href="#b"><Icon icon="unordered-list" /> Tracks</a>
			<a href="#c"><Icon icon="hash" /> Tags</a>
			<a href="#d"><Icon icon="sparkles" /> Related</a>
		</nav>
	</div>

	<p><small>With secondary nav (<code>.track-tabs</code> pattern)</small></p>
	<div class="tabs" style="border-bottom: 1px solid var(--gray-5);">
		<nav>
			<a href="#a" class="active"><Icon icon="circle-info" /> Radio4000</a>
			<a href="#b"><Icon icon="play-fill" /> YouTube</a>
			<a href="#c"><Icon icon="code-branch" /> MusicBrainz</a>
			<a href="#d"><Icon icon="tag" /> Discogs</a>
		</nav>
		<nav style="margin-left: auto;">
			<a href="#e"><Icon icon="settings" /> Edit</a>
		</nav>
	</div>
</section>

<section>
	<h2>Chip (<code>.chip</code>)</h2>
	<p><small>Standalone toggle</small></p>
	<div class="row">
		<button class="chip">jazz</button>
		<button class="chip active">dub</button>
		<button class="chip" disabled>disabled</button>
	</div>
	<p>
		<small
			>As link (<code>a.btn.chip</code>) — the nav pattern in channel/explore/search/track tabs</small
		>
	</p>
	<div class="row">
		<a href="#a" class="btn chip">all</a>
		<a href="#b" class="btn chip active">channels</a>
		<a href="#c" class="btn chip">tracks</a>
	</div>
	<p>
		<small
			>With delete — label as toggle (<code>button.chip</code> + <code>.chip-delete</code>)</small
		>
	</p>
	<div class="row">
		<span class="chip-group">
			<button class="chip">jazz</button>
			<button class="chip-delete" aria-label="Remove jazz">×</button>
		</span>
		<span class="chip-group">
			<button class="chip active">dub</button>
			<button class="chip-delete" aria-label="Remove dub">×</button>
		</span>
		<span class="chip-group">
			<button class="chip" disabled>disabled</button>
			<button class="chip-delete" disabled aria-label="Remove">×</button>
		</span>
	</div>
	<p>
		<small>With delete — label as inert (<code>span.chip</code> + <code>.chip-delete</code>)</small>
	</p>
	<div class="row">
		<span class="chip-group">
			<span class="chip">jazz</span>
			<button class="chip-delete" aria-label="Remove jazz">×</button>
		</span>
		<span class="chip-group">
			<span class="chip active">dub</span>
			<button class="chip-delete" aria-label="Remove dub">×</button>
		</span>
	</div>
</section>

<section>
	<h2>Mode actions (channel header — <code>.mode-action</code>)</h2>
	<p>
		<small
			>The three channel-engagement buttons from <code>[slug]/+layout.svelte</code>: <b>live</b>
			(broadcast/listen), <b>auto</b> (auto-radio), <b>play</b> (playback). Styled globally in
			<code>buttons.css</code>. The global <code>button.active</code> rules also apply.</small
		>
	</p>

	<p><small>Every mode × every state — hover the middle column manually:</small></p>
	<table>
		<thead>
			<tr>
				<th>Mode</th>
				<th>Idle</th>
				<th>Hover/focus</th>
				<th>Active</th>
				<th>Drifted</th>
				<th>Disabled</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>.live</code></td>
				<td>
					<button class="mode-action live"
						><Icon icon="signal" size={14} /> <span>Live</span></button
					>
				</td>
				<td><small>hover →</small></td>
				<td>
					<button class="mode-action live active"
						><Icon icon="signal" size={14} /> <span>Live</span></button
					>
				</td>
				<td>—</td>
				<td>
					<button class="mode-action live" disabled
						><Icon icon="signal" size={14} /> <span>Live</span></button
					>
				</td>
			</tr>
			<tr>
				<td><code>.auto</code></td>
				<td>
					<button class="mode-action auto"
						><Icon icon="infinite" size={14} /> <span>Auto</span></button
					>
				</td>
				<td><small>hover →</small></td>
				<td>
					<button class="mode-action auto active"
						><Icon icon="infinite" size={14} /> <span>Auto</span></button
					>
				</td>
				<td>
					<button class="mode-action auto active drifted"
						><Icon icon="infinite" size={14} /> <span>Auto</span></button
					>
				</td>
				<td>
					<button class="mode-action auto" disabled
						><Icon icon="infinite" size={14} /> <span>Auto</span></button
					>
				</td>
			</tr>
			<tr>
				<td><code>.play</code></td>
				<td>
					<button class="mode-action play"
						><Icon icon="play-fill" size={14} /> <span>Play</span></button
					>
				</td>
				<td><small>hover →</small></td>
				<td>
					<button class="mode-action play active"
						><Icon icon="pause" size={14} /> <span>Pause</span></button
					>
				</td>
				<td>—</td>
				<td>
					<button class="mode-action play" disabled
						><Icon icon="play-fill" size={14} /> <span>Play</span></button
					>
				</td>
			</tr>
		</tbody>
	</table>

	<p>
		<small
			>Direct comparison — <code>.mode-action.play.active</code> vs <code>.btn.chip.active</code>.
			Note (1) play's active fill is the same <code>--accent-4</code> as its hover, and (2) play's
			icon is <code>--accent-9</code> (from global <code>button.active svg</code>) while its text is
			<code>--accent-11</code>:</small
		>
	</p>
	<div class="row">
		<button class="mode-action play active"
			><Icon icon="pause" size={14} /> <span>Pause</span></button
		>
		<button class="chip active"><Icon icon="tag" /> Chip active</button>
	</div>
</section>

<section>
	<h2>Tags (<code>&lt;Tag&gt;</code>)</h2>
	<div class="row">
		<Tag href="#tag">#dub</Tag>
		<Tag href="#tag">#reggae</Tag>
		<Tag href="#tag">#electronic</Tag>
		<Tag onclick={() => {}}>clickable tag</Tag>
	</div>
	<p>
		<small
			>States are auto-derived: <code>playing</code> when a deck plays a matching tag,
			<code>filtered</code> when it's in the URL <code>?tags=</code>. Shown here forced via props.</small
		>
	</p>
	<div class="row">
		<Tag href="#tag" playing>#playing</Tag>
		<Tag href="#tag" filtered>#filtered</Tag>
		<Tag onclick={() => {}} playing>#playing</Tag>
		<Tag onclick={() => {}} filtered>#filtered</Tag>
	</div>
</section>

<section>
	<h2>Tags menu (<code>.nav-vertical.tags-menu</code>)</h2>
	<menu class="nav-vertical tags-menu">
		<button type="button">dub (12)</button>
		<button type="button" class="active">reggae (8)</button>
		<button type="button">electronic (5)</button>
		<button type="button">ambient (3)</button>
	</menu>
</section>

<section>
	<h2>Badges (<code>.channel-badge</code>)</h2>
	<div class="row">
		<span class="channel-badge">Live</span>
		<span class="channel-badge">Badge</span>
		<button class="channel-badge">Button badge</button>
		<button class="channel-badge drifted">Drifted</button>
		<span class="channel-badge" style:background="var(--color-red)" style:color="white">3</span>
	</div>
</section>

<section>
	<h2>Sizes comparison</h2>
	<div class="row">
		<button style="font-size: var(--font-2)">Small</button>
		<button>Default</button>
		<button style="font-size: var(--font-6)">Large</button>
	</div>
</section>

<section>
	<h2>All variants side-by-side</h2>
	<table>
		<thead>
			<tr>
				<th>Variant</th>
				<th>Default</th>
				<th>Hover/focus</th>
				<th>Active</th>
				<th>Disabled</th>
				<th>With icon</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>button</code></td>
				<td><button>Label</button></td>
				<td><small>hover me →</small></td>
				<td><button class="active">Label</button></td>
				<td><button disabled>Label</button></td>
				<td><button><Icon icon="add" /> Label</button></td>
			</tr>
			<tr>
				<td><code>.primary</code></td>
				<td><button class="primary">Label</button></td>
				<td><small>hover me →</small></td>
				<td><button class="primary active">Label</button></td>
				<td><button class="primary" disabled>Label</button></td>
				<td><button class="primary"><Icon icon="play-fill" /> Label</button></td>
			</tr>
			<tr>
				<td><code>.danger</code></td>
				<td><button class="danger">Label</button></td>
				<td><small>hover me →</small></td>
				<td><button class="danger active">Label</button></td>
				<td><button class="danger" disabled>Label</button></td>
				<td><button class="danger"><Icon icon="delete" /> Label</button></td>
			</tr>
			<tr>
				<td><code>.ghost</code></td>
				<td><button class="ghost">Label</button></td>
				<td><small>hover me →</small></td>
				<td><button class="ghost active">Label</button></td>
				<td><button class="ghost" disabled>Label</button></td>
				<td><button class="ghost"><Icon icon="settings" /> Label</button></td>
			</tr>
			<tr>
				<td><code>.link</code></td>
				<td><button class="link">Label</button></td>
				<td><small>hover me →</small></td>
				<td>—</td>
				<td><button class="link" disabled>Label</button></td>
				<td>—</td>
			</tr>
			<tr>
				<td><code>.chip</code></td>
				<td><button class="chip">Label</button></td>
				<td><small>hover me →</small></td>
				<td><button class="chip active">Label</button></td>
				<td><button class="chip" disabled>Label</button></td>
				<td><button class="chip"><Icon icon="tag" /> Label</button></td>
			</tr>
		</tbody>
	</table>
</section>

<style>
	.row {
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-block: 0.5rem;
	}
	.pair {
		align-items: center;
	}
</style>
