/**
 * Creates a new Glyphr Studio theme
 */
export class GlyphrTheme {
	/**
	 * Initialize a theme, with defaults
	 * @param {Object} newTheme - Glyphr Studio theme JSON
	 */
	constructor(newTheme = {}) {
		this.settings = Object.assign(
			{
				handleSize: 7,
				rotateHandleHeight: 40,
				multiSelectThickness: 3,
				colors: {
					// Loosely following https://m3.material.io/styles/color/roles
					primary: 'hsl(198, 100%, 46%)',
					onPrimary: 'hsl(198, 100%, 96%)',
					primaryContainer: 'hsl(198, 100%, 70%)',
					secondary: 'hsl(198, 40%, 59%)',
					onSecondary: 'hsl(198, 40%, 94%)',
					secondaryContainer: 'hsl(198, 40%, 65%)',
					tertiary: 'hsl(285, 100%, 61%)',
					onTertiary: 'hsl(285, 100%, 97%)',
					tertiaryContainer: 'hsl(285, 100%, 81%)',
					surfaceDim: 'hsl(220, 100%, 85%)',
					surface: 'hsl(220, 100%, 92%)',
					onSurface: 'hsl(0, 0%, 0%)',
					onSurfaceVariant: 'hsl(0, 0%, 30%)',
					glyphComponent: 'hsl(125, 100%, 36%)', // Color assotiated with components
					glyphFill: 'hsl(0, 0%, 0%)', // Fill color for glyph paths and previews
					glyphBackground: 'hsl(0, 0%, 100%)', // Background for glyph editors and previews
					pointFill: 'hsl(0, 0%, 100%)', // Control point/handle fill
				},
			},
			newTheme
		);
	}
	applyColors() {
		Object.entries(this.settings.colors).forEach(([key, value]) => {
			document.documentElement.style.setProperty('--color-' + key, value);
		});
	}
}
