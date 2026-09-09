import { offsetHSL, parseHSLString } from '../common/colors';
import { caseCamelToKebab } from '../common/functions';
import { showToast } from '../controls/dialogs/dialogs';

const fallbackColor = 'hsl(0, 0%, 0%)';

/**
 * Creates a new Glyphr Studio theme
 */
export class GlyphrTheme {
	/**
	 * Initialize a theme, with defaults
	 * @param {Object} newTheme - Glyphr Studio theme JSON
	 */
	constructor(newTheme = {}) {
		this.valid = true; // Switched to false if errors occur while parsing a theme.
		this.settings = Object.assign(
			{
				handleSize: 7,
				rotateHandleHeight: 40,
				multiSelectThickness: 3,
				colors: {
					// Loosely following https://m3.material.io/styles/color/roles
					primary: 'hsl(198, 100%, 46%)',
					primaryContainer: 'hsl(198, 100%, 70%)',
					onPrimary: 'hsl(198, 100%, 96%)',
					onPrimaryFixed: 'hsl(198, 100%, 8%)',
					onPrimaryFixedVariant: 'hsl(198, 100%, 21%)',
					secondary: 'hsl(198, 40%, 59%)',
					secondaryContainer: 'hsl(198, 40%, 65%)',
					onSecondary: 'hsl(198, 40%, 94%)',
					onSecondaryFixed: 'hsl(198, 40%, 10%)',
					onSecondaryFixedVariant: 'hsl(198, 40%, 17%)',
					tertiary: 'hsl(285, 100%, 61%)',
					tertiaryContainer: 'hsl(285, 100%, 81%)',
					onTertiary: 'hsl(285, 100%, 97%)',
					onTertiaryFixed: 'hsl(198, 100%, 10%)',
					onTertiaryFixedVariant: 'hsl(285, 100%, 9%)',
					surfaceDim: 'hsl(220, 100%, 85%)',
					surface: 'hsl(220, 100%, 92%)',
					onSurface: 'hsl(0, 0%, 0%)',
					onSurfaceVariant: 'hsl(0, 0%, 30%)',
					glyphComponent: 'hsl(125, 100%, 36%)', // Color assotiated with components
					glyphFill: 'hsl(0, 0%, 0%)', // Fill color for glyph paths and previews
					glyphBackground: 'hsl(0, 0%, 100%)', // Background for glyph editors and previews
					pointFill: 'hsl(0, 0%, 100%)', // Control point/handle fill
					guideLight: 'rgb(127, 0, 255)',
					guideMedium: 'rgb(212, 154, 125)',
					guideDark: 'rgb(191, 106, 64)',
					grid: 'rgb(96, 96, 136)',
				},
				gradients: {
					onPrimaryFixed: { val: 0.1, colors: ['onPrimaryFixed'] },
					darkPrimaryTertiary: {
						deg: 135,
						colors: ['onPrimaryFixedVariant', 'onTertiaryFixedVariant'],
					},
				},
			},
			newTheme
		);
	}
	/**
	 * Applies the current colors to the document.
	 */
	applyColors() {
		this.valid = true;
		Object.entries(this.settings.colors).forEach(([name, color]) => {
			let nameKebab = caseCamelToKebab(name);
			this.#validateColor(name, color);
			document.documentElement.style.setProperty('--color-' + nameKebab, color);
		});

		// Gradients
		Object.entries(this.settings.gradients).forEach(([name, entry]) => {
			let nameKebab = caseCamelToKebab(name);
			let gradient = this.#parseGradientEntry(name, entry);
			// log(`Generated gradient: ${gradient}`);
			document.documentElement.style.setProperty('--gradient-' + nameKebab, gradient);
		});
		if (!this.valid) {
			showToast(`Current theme has errors`, 8000);
		}
	}

	/**
	 * Parses a CSS gradient using a this.settings.gradient key:value entry.
	 * @param {string} name
	 * @param {object} entry
	 */
	#parseGradientEntry(name, entry) {
		let errors = false;
		let gradient = fallbackColor;
		if (typeof entry.colors == 'string') {
			entry.colors = [entry.colors];
		}
		if (Array.isArray(entry.colors)) {
			if (entry.length == 0) {
				log(new Error(`Gradient "${name}" does not reference at least one color: ${entry}`));
				this.valid = false;
			} else if (entry.length == 1) {
				// Single-color HSL shift gradient
				let c1 = this.#getValidColor(entry.colors[0]);
				let c2 = offsetHSL(c1, {
					hue: entry.hue || 0,
					sat: entry.sat || 0,
					val: entry.val || 0,
				});
				gradient = `linear-gradient(${entry.deg || 135}deg, ${c1}, ${c2})`;
			} else {
				// Multi-stop gradient using theme colors
				gradient = `linear-gradient(${entry.deg || 135}deg`;
				for (let colorKey of entry.colors) {
					let color = this.#getValidColor(colorKey);
					gradient += `, ${color}`;
				}
				gradient += ')';
			}
		} else {
			log(new Error(`Invalid gradient entry "${name}": ${entry}`));
			this.valid = false;
		}
		// log(`created gradient"${key}":`, gradient);
		return gradient;
	}

	/**
	 * Check if a color exists in this theme.
	 * @param {string} name
	 */
	checkColorExists(name) {
		if (!(name in this.settings.colors)) {
			return false;
		}
		return true;
	}
	/**
	 * Retrieve a color value. Returns a fallback if the key doesn't exist.
	 * @param {string} name
	 */
	getColor(name) {
		if (!(name in this.settings.colors)) {
			return fallbackColor;
		}
		return this.settings.colors[name];
	}

	/**
	 * Validates a given color, or returns the fallback and sets `this.valid` to false.
	 * @param {string} name
	 * @param {string} color
	 */
	#validateColor(name, color) {
		if (!parseHSLString(color)) {
			log(new Error(`Color "${name}" is invalid: "${color}"`));
			this.valid = false;
			return fallbackColor;
		}
		return color;
	}

	/**
	 * Retrieve and validates a color. Flips the `this.valid` flag to false if one doesn't exist and returns a fallback.
	 * @param {string} key
	 */
	#getValidColor(key) {
		if (!(key in this.settings.colors)) {
			log(new Error(`Color "${key}" does not exist in theme.`));
			this.valid = false;
			return fallbackColor;
		}
		let color = this.#validateColor(key, this.settings.colors[key]);
		return color;
	}
}
