// Resolves a CSS custom-property color to concrete sRGB, for MapLibre paint expressions
// and WebGL uniforms. getComputedStyle can return oklch() in modern browsers, which
// MapLibre's color parser doesn't support — canvas fillStyle always normalizes to sRGB bytes.
// One canvas + hidden probe element, created lazily and reused across all callers.

let canvas, ctx, probe

function ensureProbe() {
	if (probe) return
	canvas = document.createElement('canvas')
	canvas.width = canvas.height = 1
	ctx = /** @type {CanvasRenderingContext2D} */ (
		canvas.getContext('2d', {willReadFrequently: true})
	)
	probe = document.createElement('div')
	probe.style.visibility = 'hidden'
	probe.style.position = 'absolute'
	document.body.append(probe)
}

function sampleColor(variableName, fallback) {
	ensureProbe()
	probe.style.color = `var(${variableName})`
	const raw = getComputedStyle(probe).color
	ctx.clearRect(0, 0, 1, 1)
	ctx.fillStyle = raw || fallback
	ctx.fillRect(0, 0, 1, 1)
	return ctx.getImageData(0, 0, 1, 1).data
}

/** @param {string} variableName @param {string} [fallback] @returns {string} "rgb(r, g, b)" */
export function resolveCssColor(variableName, fallback = '#888888') {
	const [r, g, b] = sampleColor(variableName, fallback)
	return `rgb(${r}, ${g}, ${b})`
}

/** Same resolution, as normalized sRGB floats (0–1) for WebGL uniforms. */
export function resolveCssColorFloat(variableName, fallback = '#888888') {
	const [r, g, b] = sampleColor(variableName, fallback)
	return new Float32Array([r / 255, g / 255, b / 255])
}
