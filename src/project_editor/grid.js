import { defaultCustomGuideColor } from './guide';

/**
 * A grid type
 **/
export class Grid {
	constructor(oa = {}) {
		// log(`Grid.constructor`, 'start');
		this.objType = 'Grid';
		this.settings = {
			name: oa.name,
			location: !isNaN(parseInt(oa.location)) ? parseInt(oa.location) : 200,
			// em, scaled by zoom. 0 always snaps
			snapLimitEdge: oa.snapLimitEdge || 20,
			snapLimitCorner: oa.snapLimitCorner || 20,
			color: oa.color || defaultCustomGuideColor,
			visible: !!oa.visible,
			x: {
				enabled: oa.x?.enabled !== false,
				size: oa.x?.size || 100,
				offset: oa.x?.offset || 0,
			},
			y: {
				enabled: oa.y?.enabled !== false,
				size: oa.y?.size || 100,
				offset: oa.y?.offset || 0,
			},
		};
		// log(`Grid.constructor`, 'end');
	}

	save() {
		return this.settings;
	}

	/**
	 * @param {number} pos
	 * @param {number} size
	 * @param {number} z
	 */
	#snapDimension(pos, size, z) {
		const edge1 = Math.floor(pos / size) * size;
		const edge2 = edge1 + size;
		let result = { pos: pos < (edge1 + edge2) / 2 ? edge1 : edge2, withinLimit: false };

		// Limit checking
		const limitEdge = this.settings.snapLimitEdge / z;
		if (limitEdge === 0) {
			result.withinLimit = true;
		} else if (Math.abs(pos - edge1) < limitEdge) {
			result.withinLimit = true;
		} else if (Math.abs(pos - edge2) < limitEdge) {
			result.withinLimit = true;
		}
		return result;
	}

	/**
	 * @param {number} x
	 * @param {number} z
	 */
	snapX(x, z) {
		x += this.settings.x.offset;
		let size = this.settings.x.size;
		return this.#snapDimension(x, size, z);
	}
	/**
	 * @param {number} y
	 * @param {number} z
	 */
	snapY(y, z) {
		y += this.settings.y.offset;
		let size = this.settings.y.size;
		return this.#snapDimension(y, size, z);
	}

	/**
	 * @param {number} x - x position
	 * @param {number} y - y position
	 * @param {number} z - zoom level to scale corner snapping by
	 */
	snap(x, y, z) {
		let result = { x, y };
		const snapX = this.snapX(x, z);
		const snapY = this.snapX(y, z);

		// corner snapping
		if (this.settings.x.enabled && this.settings.y.enabled) {
			const limitCorner = this.settings.snapLimitCorner / z;
			if (
				limitCorner === 0 ||
				(Math.abs(x - snapX.pos) < limitCorner && Math.abs(y - snapY.pos) < limitCorner)
			) {
				return { x: snapX.pos, xHit: true, y: snapY.pos, yHit: true };
			}
		}

		// edge snapping
		if (this.settings.snapLimitEdge > 0) {
			const dx = Math.abs(snapX.pos - x);
			const dy = Math.abs(snapY.pos - y);
			if (this.settings.x.enabled && snapX.withinLimit && Math.min(dx, dy) === dx) {
				result.x = snapX.pos; // keep y: snap to vertical edge
				result.xHit = true;
			} else if (this.settings.y.enabled && snapY.withinLimit && Math.min(dx, dy) === dy) {
				result.y = snapY.pos; // keep x: snap to horizontal edge
				result.yHit = true;
			}
		}
		return result;
	}
}
