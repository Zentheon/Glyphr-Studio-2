/**
		Guide
		An object used by the UI for drawing guide
		lines on the edit canvas, and for saving
		custom guides to a Glyphr Studio Project.
**/

import { makeRandomSaturatedColor } from '../common/colors';

export class Guide {
	constructor(oa = {}) {
		// log(`Guide.constructor`, 'start');
		this.objType = 'Guide';
		this._name = oa?.name ?? null;
		this.enabled = oa?.enabled ?? true;
		this.position = !isNaN(parseInt(oa.position)) ? parseInt(oa.position) : 200;
		this.angle = oa?.angle ?? 90;
		this.color = oa?.color ?? makeRandomSaturatedColor();
		this.snapEnabled = oa?.snapEnabled ?? true;
		this.snapLimit = oa?.snapLimit ?? 25;
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
			if (this.angle === 0 && Math.abs(x - this.position) < limit) {
				result.x = this.position;
				result.xWithinLimit = true;
			}
			if (this.angle === 90 && Math.abs(y - this.position) < limit) {
				result.y = this.position;
				result.yWithinLimit = true;
			}
		}

		return result;
	}

	save(system = false) {
		let result = {};

		result.enabled = this.enabled;
		result.name = this._name;
		result.snapEnabled = this.snapEnabled;
		result.snapLimit = this.snapLimit;
		if (!system) {
			result.position = this.position;
			result.angle = this.angle;
			result.color = this.color;
		}

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
	constructor(font, oa = {}) {
		// log(`SystemGuides.constructor`, 'start');
		this.objType = 'SystemGuides';

		this.enabled = oa?.enabled ?? true;
		this.showLabels = oa?.showLabels ?? false;
		this.transparency = oa?.transparency ?? 70;
		this.snapEnabled = oa?.snapEnabled ?? true;
		this.snapLimit = oa?.snapLimit ?? 25;
		this._horizontal = {};
		this._vertical = {};

		function initGuide(obj, key, enabled, angle, name, position, color) {
			let directionKey;
			directionKey = angle === 90 ? '_horizontal' : '_vertical';
			obj[directionKey][key] = new Guide({
				angle: angle,
				name: oa.guides?.name?.[key]?.name ?? name,
				position: position,
				color: color,
				enabled: oa.guides?.[key]?.enabled ?? enabled,
				snapEnabled: oa.guides?.[key]?.enabled ?? true,
				snapLimit: oa.guides?.[key]?.enabled ?? 25,
			});
		}

		initGuide(this, 'ascent', false, 90, 'Ascent', font.ascent, guideColorMedium);
		initGuide(this, 'capHeight', false, 90, 'Cap height', font.capHeight, guideColorLight);
		initGuide(this, 'xHeight', false, 90, 'X height', font.xHeight, guideColorLight);
		initGuide(this, 'baseline', true, 90, 'Baseline', 0, guideColorDark);
		initGuide(this, 'descent', false, 90, 'Descent', font.descent, guideColorMedium);
		initGuide(this, 'leftSide', true, 0, 'Left side', 0, guideColorDark);
		initGuide(this, 'rightSide', true, 0, 'Right side', 0, guideColorDark);

		// log(`Guide.constructor`, 'end');
	}
	save() {
		let result = {};

		result.enabled = this.enabled;
		result.transparency = this.transparency;
		result.snapEnabled = this.snapEnabled;
		result.snapLimit = this.snapLimit;
		result.guides = {};

		for (let [key, guide] of Object.entries(this._horizontal)) {
			result.guides[key] = guide.save(true);
		}
		for (let [key, guide] of Object.entries(this._vertical)) {
			result.guides[key] = guide.save(true);
		}
		return result;
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
		this._vertical.rightSide.position = item.advanceWidth;
		return this._vertical;
	}
	getAll(item) {
		return { ...this.getHorizontal(), ...this.getVertical(item) };
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
