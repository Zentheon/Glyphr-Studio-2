/**
		Guide
		An object used by the UI for drawing guide
		lines on the edit canvas, and for saving
		custom guides to a Glyphr Studio Project.
**/

export class Guide {
	constructor(oa = {}) {
		// log(`Guide.constructor`, 'start');
		this.objType = 'Guide';
		this.angle = oa.angle === 0 ? 0 : 90;
		this.name = oa.name;
		this.location = !isNaN(parseInt(oa.location)) ? parseInt(oa.location) : 200;
		this.snapEnabled = true;
		this.snapLimit = oa.snapLimit || 25;
		this.color = oa.color || defaultCustomGuideColor;
		this.visible = !!oa.visible;
		// log(`Guide.constructor`, 'end');
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	snap(x, y, z) {
		let result = { x, y, xWithinLimit: false, yWithinLimit: false };
		if (this.snapEnabled) {
			const limit = this.snapLimit / z;
			if (this.angle === 0 && Math.abs(x - this.location) < limit) {
				result.x = this.location;
				result.xWithinLimit = true;
			}
			if (this.angle === 90 && Math.abs(y - this.location) < limit) {
				result.y = this.location;
				result.yWithinLimit = true;
			}
		}

		return result;
	}

	save() {
		let result = {};

		let n = this.name;
		if (n !== 'Horizontal guide' && n !== 'Vertical guide' && n !== 'Guide') {
			result.name = this.name;
		}
		if (this.angle !== 90) result.angle = this.angle;
		if (this.location !== 200) result.location = this.location;
		if (this.color !== defaultCustomGuideColor) result.color = this.color;
		if (!this.visible) result.visible = this.visible;

		return result;
	}

	get name() {
		if (!this._name) {
			if (this.angle === 90) this._name = 'Horizontal guide';
			else if (this.angle === 0) this._name = 'Vertical guide';
			else this._name = 'Guide';
		}
		return this._name;
	}

	set name(newName) {
		if (!newName) {
			if (this.angle === 90) newName = 'Horizontal guide';
			else if (this.angle === 0) newName = 'Vertical guide';
			else newName = 'Guide';
		}
		this._name = newName;
	}
}

export class SystemGuides {
	constructor(font = {}, enabled = true) {
		// log(`SystemGuides.constructor`, 'start');
		this.objType = 'SystemGuides';
		this.snapEnabled = true;
		this.snapLimit = 25;
		this.enabled = enabled;
		this.transparency = 0;
		this._horizontal = {
			ascent: new Guide({
				angle: 90,
				name: 'Ascent',
				location: font.ascent,
				color: guideColorMedium,
				visible: false,
			}),
			capHeight: new Guide({
				angle: 90,
				name: 'Cap height',
				location: font.capHeight,
				color: guideColorLight,
				visible: false,
			}),
			xHeight: new Guide({
				angle: 90,
				name: 'X height',
				location: font.xHeight,
				color: guideColorLight,
				visible: false,
			}),
			baseline: new Guide({
				angle: 90,
				name: 'Baseline',
				location: font.baseline,
				color: guideColorDark,
				visible: true,
			}),
			descent: new Guide({
				angle: 90,
				name: 'Descent',
				location: font.descent,
				color: guideColorMedium,
				visible: false,
			}),
		};
		this._vertical = {
			leftSide: new Guide({
				angle: 0,
				name: 'Left side',
				location: 0,
				color: guideColorDark,
				visible: true,
			}),
			rightSide: new Guide({
				angle: 0,
				name: 'Right side',
				location: 0,
				color: guideColorDark,
				visible: true,
			}),
		};
		// log(`Guide.constructor`, 'end');
	}
	setProperty(guide, property, value) {
		if (this._horizontal[guide]) {
			this._horizontal[guide][property] = value;
		} else if (this._vertical[guide]) {
			this._vertical[guide][property] = value;
		} else {
			log(new Error(`system guide ${guide} does not exist`));
		}
	}
	getHorizontal() {
		return this._horizontal;
	}
	getVertical(item) {
		this._vertical.leftSide.location = item.rightSideBearing;
		this._vertical.rightSide.location = item.rightSideBearing;
		return this._vertical;
	}
}

// --------------------------------------------------------------
// Colors
// --------------------------------------------------------------

export const defaultCustomGuideColor = 'rgb(127, 0, 255)';
export const guideColorLight = 'rgb(227, 190, 171)';
export const guideColorMedium = 'rgb(212, 154, 125)';
export const guideColorDark = 'rgb(191, 106, 64)';
export const gridColor = 'rgb(96, 96, 136)';
