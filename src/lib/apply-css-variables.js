const baseColorVars = ['--accent-light', '--accent-dark', '--gray-light', '--gray-dark']

export function applyCustomCssVariables(customVariables = {}) {
	const root = document.documentElement

	// Reset everything if empty
	if (!Object.keys(customVariables).length) {
		for (const prop of baseColorVars) root.style.removeProperty(prop)
		for (const prop of [
			'--button-bg-light',
			'--button-bg-dark',
			'--button-color-light',
			'--button-color-dark',
			'--scaling',
			'--border-radius',
			'--media-radius'
		]) {
			root.style.removeProperty(prop)
		}
		return
	}

	// Base scale sources — CSS derives accent-*/gray-* from these
	for (const prop of baseColorVars) {
		if (customVariables[prop]) root.style.setProperty(prop, customVariables[prop])
	}

	// Everything else (button overrides, scaling, radii, …).
	// Button light/dark merge lives in buttons.css via light-dark().
	Object.entries(customVariables).forEach(([name, value]) => {
		if (value && !baseColorVars.includes(name)) {
			root.style.setProperty(name, value)
		}
	})
}
