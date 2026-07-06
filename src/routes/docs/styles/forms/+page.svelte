<svelte:head>
	<title>Forms — Radio4000 docs</title>
</svelte:head>

<h1>Forms</h1>
<p>
	<small
		>Inputs from <code>forms.css</code>. Buttons live in
		<a href="/docs/styles/buttons">buttons</a>.</small
	>
</p>

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
