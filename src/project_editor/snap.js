import { getCurrentProjectEditor } from '../app/main';
import { calculateAngle } from '../common/functions';
import { cXsX, cYsY } from '../edit_canvas/edit_canvas';
import { ehd } from '../edit_canvas/events';
import { isAngleMoreHorizontal } from '../edit_canvas/tools/path_edit';
import { panelsEventHandlerData } from '../panels/panel_events';
import { Maxes } from '../project_data/maxes';
import { Grid } from './grid';
import { MultiSelectShapes } from './multiselect';
import { ProjectEditor } from './project_editor';

/**
 * Snapping handler
 **/
export class Snap {
	constructor() {
		// log(`Snap.constructor`, 'start');
		this.lock = { x: false, y: false };
		this.objType = 'Snap';
		this.settings = {
			// snapLimitEdge: oa.snapLimitEdge || 0.5, // 0 to 1 grid cell range
			// snapLimitCorner: oa.snapLimitCorner || 20, // em, scaled by zoom. 0 always snaps
		};
		/** @type {MultiSelectShapes | null} */
		this.shapes = null;
		this.point = {
			x: 0,
			y: 0,
			xLocked: false,
			yLocked: false,
			parent: null,
		};
		this.snapped = {
			x: null,
			y: null,
		};
		// log(`Snap.constructor`, 'end');
	}

	/**
	 * @param {number } x
	 * @param {number} y
	 * @param {ProjectEditor} editor - working editor
	 * @param {object} data - event handler data
	 */
	snapPoint(
		x = ehd.current.point.x,
		y = ehd.current.point.y,
		editor = getCurrentProjectEditor(),
		data = ehd
	) {
		let result = { x, y };

		if (data.isAltDown) {
			// No regular snapping while alt is held
			return result;
		}

		let tmp = { x: result.x, y: result.y };
		let guides = editor.project.settings.guides;

		// --------------------------------------------------------------
		// Grids
		// --------------------------------------------------------------

		if (guides.grids.enabled && guides.grids.snap && !data.isAltDown) {
			let grid = new Grid();
			grid.settings.x.size = editor.project.settings.font.upm / 10;
			grid.settings.y.size = editor.project.settings.font.upm / 10;

			let snapped = grid.snap(x, y, data.current.zoom);
			tmp.x = snapped.x;
			tmp.y = snapped.y;
		}

		// --------------------------------------------------------------
		// Guides
		// --------------------------------------------------------------

		// System guides
		if (guides.system.enabled) {
			let item = getCurrentProjectEditor().selectedItem;
			for (const guide of Object.values(guides.system.getAll(item))) {
				if (guide.enabled) {
					let snapped = guide.snap(x, y, data.current.zoom);
					if (snapped.xWithinLimit) tmp.x = snapped.x;
					if (snapped.yWithinLimit) tmp.y = snapped.y;
				}
			}
		}
		// Custom guide snap
		if (guides.custom.enabled) {
			for (const guide of guides.custom.guides) {
				if (guide.enabled) {
					let snapped = guide.snap(x, y, data.current.zoom);
					if (snapped.xWithinLimit) tmp.x = snapped.x;
					if (snapped.yWithinLimit) tmp.y = snapped.y;
				}
			}
		}

		log(`lock.x: ${this.lock.x}, lock.y: ${this.lock.y}`);
		if (!this.lock.x) result.x = tmp.x;
		if (!this.lock.y) result.y = tmp.y;

		return result;
	}
	/**
	 * @param {ProjectEditor} editor - working editor
	 * @param {object} data - event handler data
	 */
	snapBoundingBox(editor = getCurrentProjectEditor(), data = ehd) {
		let corners = data.initial.maxes.corners;

		let bl = { x: corners[0].x - data.current.offset.x, y: corners[0].y - data.current.offset.y };
		// log(corners);
		this.point.x = data.initial.point.x - data.current.offset.x;
		this.point.y = data.initial.point.y - data.current.offset.y;

		let result = this.snapPoint(bl.x, bl.y, editor, data);

		result.x = data.current.point.x - (bl.x - result.x);
		result.y = data.current.point.y - (bl.y - result.y);
		return result;
	}
	// --------------------------------------------------------------
	// Axis lock
	// --------------------------------------------------------------
	axisLock(
		x = ehd.current.point.x,
		y = ehd.current.point.y,
		editor = getCurrentProjectEditor(),
		data = ehd
	) {
		let result = { x, y };

		this.lock = { x: false, y: false };
		if (data.isShiftDown) {
			// Check for locking to horizontal/vertical
			if (!data.ctxType?.startsWith('h') || data.isCtrlDown) {
				const base = { x: data.initial.point.x, y: data.initial.point.y };
				const ang = calculateAngle({ x, y }, base);
				if (isAngleMoreHorizontal(ang)) {
					// Point is moving more horizontal, lock to mouse y
					// log(`locking to y`);
					this.lock.y = true;
					result.y = data.initial.point.y;
				} else {
					// Point is moving more vertical, lock to mouse x
					// log(`locking to x`);
					this.lock.x = true;
					result.x = data.initial.point.x;
				}
			} else if (typeof data.initial.point?.angle === 'number') {
				this.lock = { x: true, y: true };
				let initial = data.initial.point;
				log(`Initial point angle: ${initial.angle}`);
				const ux = Math.cos(initial.angle);
				const uy = Math.sin(initial.angle);
				// Vector from start to current
				const dx = x - initial.x;
				const dy = y - initial.y;
				// Dot product (projection distance)
				const t = dx * ux + dy * uy;
				result = {
					x: initial.x + t * ux,
					y: initial.y + t * uy,
				};
			}
		}
		return result;
	}
}
