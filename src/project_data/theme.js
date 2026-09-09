import { offsetHSL, parseHSLString } from '../common/colors';
import { caseCamelToKebab, clone, json } from '../common/functions';
import { showToast } from '../controls/dialogs/dialogs';

export const fallbackColor = 'hsl(0, 0%, 0%)';

/** @type {Object} */
import glyphrLight from './themes/glyphr-light.json';

const themeArray = [glyphrLight];
export const themes = Object.fromEntries(themeArray.map((theme) => [theme.id, theme]));

/**
 * Creates a new Glyphr Studio theme
 */
export class GlyphrTheme {
	constructor(overrides = {}) {
		this.valid = true; // Switched to false if errors occur while parsing a theme.
		this.name = glyphrLight.name;
		this.id = glyphrLight.id;
		this.theme = glyphrLight.theme;
		this.baseTheme = undefined;
		this.active = {};
		this.updateOverrides(overrides);
	}

	/**
	 * Refresh the current active theme using the provided user overrides.
	 * @param {object} overrides
	 */
	updateOverrides(overrides = {}) {
		Object.assign(this.active, this.theme);
		Object.assign(this.active, overrides);
	}

	/**
	 * @param {string} themeID
	 */
	changeTheme(themeID) {
		const chain = [];
		let currentID = themeID;

		while (currentID) {
			if (!themes[currentID]) {
				return new Error(`Theme ${currentID} does not exist`);
			}
			chain.push(currentID);
			currentID = themes[currentID]['basetheme'];
		}
		if (currentID && themes[currentID]) chain.push(currentID);

		// Chain is [child, ..., base]; apply from oldest to newest so child overrides base
		for (let i = chain.length - 1; i >= 0; i--) {
			this.theme = themes[chain[i]].theme;
		}

		this.valid = true;
		this.name = themes[themeID].name || themeID;
		this.id = themeID;

		this.applyColors();
	}

	/**
	 * Applies the current colors to the document.
	 */
	applyColors() {
		this.valid = true;
		Object.entries(this.active.colors).forEach(([name, color]) => {
			let nameKebab = caseCamelToKebab(name);
			this.#validateColor(name, color);
			document.documentElement.style.setProperty('--color-' + nameKebab, color);
		});

		// Gradients
		Object.entries(this.active.gradients).forEach(([name, entry]) => {
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
	 * Parses a CSS gradient using a this.active.gradient key:value entry.
	 * @param {string} name
	 * @param {object} entry
	 */
	#parseGradientEntry(name, entry) {
		this.valid = true;
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
	 * Capture the current state into a theme object.
	 * @param {boolean} active - True: include applied overrides
	 */
	save(active = false) {
		let theme = active ? this.active : this.theme;
		const result = {
			name: this.name,
			id: this.id,
			theme: clone(theme),
		};
		if (this.baseTheme) {
			result.baseTheme = this.baseTheme;
		}
		return result;
	}

	/**
	 * Create a theme json using the current state.
	 * @param {boolean} active - True: Include applied overrides
	 *  @param {boolean} raw - True: Do not pretty format
	 */
	themeJSON(active = false, raw = true) {
		return json(this.save(active), raw);
	}

	/**
	 * Check if a color exists in this theme.
	 * @param {string} name
	 */
	checkColorExists(name) {
		if (!(name in this.active.colors)) {
			return false;
		}
		return true;
	}
	/**
	 * Retrieve a color value. Returns a fallback if the key doesn't exist.
	 * @param {string} name
	 */
	getColor(name) {
		if (!(name in this.active.colors)) {
			return fallbackColor;
		}
		return this.active.colors[name];
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
		if (!(key in this.active.colors)) {
			log(new Error(`Color "${key}" does not exist in theme.`));
			this.valid = false;
			return fallbackColor;
		}
		let color = this.#validateColor(key, this.active.colors[key]);
		return color;
	}
}
