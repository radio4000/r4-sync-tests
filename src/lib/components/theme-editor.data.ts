import * as m from '$lib/paraglide/messages'

type ColorVar = {
	name: string
	label: () => string
	description: () => string
	default: string
	theme: 'light' | 'dark'
	/** Real CSS var a button falls back to when this override is unset. */
	fallbackVar?: string
}

export const fontFamilies = [
	{value: '', label: 'Radio Canada (default)'},
	{value: 'Radio Canada', label: 'Radio Canada'},
	{value: 'Epilogue', label: 'Epilogue'},
	{value: 'Firava', label: 'Firava'},
	{value: 'Recursive', label: 'Recursive'},
	{value: 'Rosario', label: 'Rosario'},
	{value: 'Sono', label: 'Sono'},
	{value: 'system-ui', label: 'System'}
]

export const baseColors: ColorVar[] = [
	{
		name: '--accent-light',
		label: () => m.theme_color_accent_light_label(),
		description: () => m.theme_color_accent_desc(),
		default: 'oklch(0.5 0.25 290)',
		theme: 'light'
	},
	{
		name: '--accent-dark',
		label: () => m.theme_color_accent_dark_label(),
		description: () => m.theme_color_accent_desc(),
		default: '#732ff1',
		theme: 'dark'
	},
	{
		name: '--gray-light',
		label: () => m.theme_color_gray_label(),
		description: () => m.theme_color_gray_desc(),
		default: 'oklch(0.67 0.012 70)',
		theme: 'light'
	},
	{
		name: '--gray-dark',
		label: () => m.theme_color_gray_label(),
		description: () => m.theme_color_gray_desc(),
		default: 'oklch(0.67 0.008 70)',
		theme: 'dark'
	}
]

export const overrides: ColorVar[] = [
	{
		name: '--button-bg-light',
		label: () => m.theme_override_button_bg_label_light(),
		description: () => m.theme_override_button_bg_desc(),
		default: '#fff',
		fallbackVar: '--gray-3',
		theme: 'light'
	},
	{
		name: '--button-bg-dark',
		label: () => m.theme_override_button_bg_label_dark(),
		description: () => m.theme_override_button_bg_desc(),
		default: '#000',
		fallbackVar: '--gray-3',
		theme: 'dark'
	},
	{
		name: '--button-color-light',
		label: () => m.theme_override_button_color_label_light(),
		description: () => m.theme_override_button_text_desc(),
		default: '#000',
		fallbackVar: '--gray-12',
		theme: 'light'
	},
	{
		name: '--button-color-dark',
		label: () => m.theme_override_button_color_label_dark(),
		description: () => m.theme_override_button_text_desc(),
		default: '#fff',
		fallbackVar: '--gray-12',
		theme: 'dark'
	}
]

export const grays = Array.from(Array(12).keys(), (i) => `--gray-${i + 1}`)
export const accents = Array.from(Array(12).keys(), (i) => `--accent-${i + 1}`)
