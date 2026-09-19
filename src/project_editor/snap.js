import { getCurrentProjectEditor } from '../app/main';
import { calculateAngle } from '../common/functions';
import { cXsX, cYsY } from '../edit_canvas/edit_canvas';
import { eventHandlerData } from '../edit_canvas/events';
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
	 * @param {object} ehd - event handler data
	 */
	snapPoint(
		x = eventHandlerData.current.point.x,
		y = eventHandlerData.current.point.y,
		editor = getCurrentProjectEditor(),
		ehd = eventHandlerData
	) {
		let result = { x, y };

		if (ehd.isAltDown) {
			// No regular snapping while alt is held
			return result;
		}

		let tmp = { x: result.x, y: result.y };
		let guides = editor.project.settings.guides;

		// --------------------------------------------------------------
		// Grids
		// --------------------------------------------------------------

		if (guides.grids.enabled && guides.grids.snap && !ehd.isAltDown) {
			let grid = new Grid();
			grid.settings.x.size = editor.project.settings.font.upm / 10;
			grid.settings.y.size = editor.project.settings.font.upm / 10;

			let snapped = grid.snap(x, y, ehd.current.zoom);
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
					let snapped = guide.snap(x, y, ehd.current.zoom);
					if (snapped.xWithinLimit) tmp.x = snapped.x;
					if (snapped.yWithinLimit) tmp.y = snapped.y;
				}
			}
		}
		// Custom guide snap
		if (guides.custom.enabled) {
			for (const guide of guides.custom.guides) {
				if (guide.enabled) {
					let snapped = guide.snap(x, y, ehd.current.zoom);
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
	 * @param {object} ehd - event handler data
	 */
	snapBoundingBox(editor = getCurrentProjectEditor(), ehd = eventHandlerData) {
		let corners = ehd.initial.maxes.corners;

		let bl = { x: corners[0].x - ehd.current.offset.x, y: corners[0].y - ehd.current.offset.y };
		// log(corners);
		this.point.x = ehd.initial.point.x - ehd.current.offset.x;
		this.point.y = ehd.initial.point.y - ehd.current.offset.y;

		let result = this.snapPoint(bl.x, bl.y, editor, ehd);

		result.x = ehd.current.point.x - (bl.x - result.x);
		result.y = ehd.current.point.y - (bl.y - result.y);
		return result;
	}
	// --------------------------------------------------------------
	// Axis lock
	// --------------------------------------------------------------
	axisLock(
		x = eventHandlerData.current.point.x,
		y = eventHandlerData.current.point.y,
		editor = getCurrentProjectEditor(),
		ehd = eventHandlerData
	) {
		let result = { x, y };

		this.lock = { x: false, y: false };
		const parentPoint = this.point.parent;
		if (ehd.isShiftDown) {
			// Check for locking to horizontal/vertical
			if (!ehd.ctxType?.startsWith('h') || ehd.isCtrlDown) {
				const base = { x: ehd.initial.point.x, y: ehd.initial.point.y };
				const ang = calculateAngle({ x, y }, base);
				if (isAngleMoreHorizontal(ang)) {
					// Point is moving more horizontal, lock to mouse y
					// log(`locking to y`);
					this.lock.y = true;
					result.y = ehd.initial.point.y;
				} else {
					// Point is moving more vertical, lock to mouse x
					// log(`locking to x`);
					this.lock.x = true;
					result.x = ehd.initial.point.x;
				}
			} else if (typeof ehd.initial.point?.angle === 'number') {
				// Snapping
				this.lock.x = true;
				this.lock.y = true;
				// Check for handle lock to original angle
				if (isAngleMoreHorizontal(ehd.initial.point.angle)) {
					// Handle is more horizontal, lock to mouse x
					const base = this.point.x - parentPoint.x + x;
					const newY = base * Math.tan(ehd.initial.point.angle) + parentPoint.y;
					result.y = newY - this.point.y;
				} else {
					// Handle is more vertical, lock to mouse y
					const base = this.point.y - parentPoint.y + y;
					const newX = base / Math.tan(ehd.initial.point.angle) + parentPoint.x;
					result.x = newX - this.point.x;
				}
			}
		}
		return result;
	}
}
