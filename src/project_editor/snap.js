import { getCurrentProjectEditor } from '../app/main';
import { calculateAngle } from '../common/functions';
import { cXsX, cYsY } from '../edit_canvas/edit_canvas';
import { isAngleMoreHorizontal } from '../edit_canvas/tools/path_edit';
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
	 * @param {object} d - current offset + view zoom
	 * @param {ProjectEditor} editor - working editor
	 * @param {object} ehd - event handler data
	 */
	snap(d, editor, ehd, point = null) {
		let lock = { x: false, y: false };
		if (!point) point = { x: cXsX(ehd.mousePosition.x), y: cYsY(ehd.mousePosition.y) };

		// --------------------------------------------------------------
		// Axis lock
		// --------------------------------------------------------------
		const parentPoint = this.point.parent;
		if (ehd.isShiftDown) {
			// Check for locking to horizontal/vertical
			if (ehd.ctxType !== 'h' || ehd.isCtrlDown) {
				const base = { x: ehd.initial.point.x, y: ehd.initial.point.y };
				const ang = calculateAngle(point, base);
				if (isAngleMoreHorizontal(ang)) {
					// Point is moving more horizontal, lock to mouse y
					// log(`locking to y`);
					lock.y = true;
					// d.x = point.x - this.point.x;
					d.y = ehd.initial.point.y;
				} else {
					// Point is moving more vertical, lock to mouse x
					// log(`locking to x`);
					lock.x = true;
					d.x = ehd.initial.point.x;
					// d.y = point.y - this.point.y;
				}
			} else if (typeof ehd.initial.point?.angle === 'number') {
				// Snapping
				lock.x = true;
				lock.y = true;
				// Check for handle lock to original angle
				if (isAngleMoreHorizontal(ehd.initial.point.angle)) {
					// Handle is more horizontal, lock to mouse x
					const base = this.point.x - parentPoint.x + d.x;
					const newY = base * Math.tan(ehd.initial.point.angle) + parentPoint.y;
					d.y = newY - this.point.y;
				} else {
					// Handle is more vertical, lock to mouse y
					const base = this.point.y - parentPoint.y + d.y;
					const newX = base / Math.tan(ehd.initial.point.angle) + parentPoint.x;
					d.x = newX - this.point.x;
				}
			}
		}

		if (ehd.isAltDown) {
			// No regular snapping while alt is held
			return d;
		}

		// Temporary offsets
		let s = { x: d.x, y: d.y };
		let guides = editor.project.settings.guides;

		// --------------------------------------------------------------
		// Grids
		// --------------------------------------------------------------

		if (guides.grids.enabled && guides.grids.snap && !ehd.isAltDown) {
			let grid = new Grid();
			grid.settings.x.size = editor.project.settings.font.upm / 10;
			grid.settings.y.size = editor.project.settings.font.upm / 10;

			let snapped = grid.snap(point.x, point.y, d.z);
			s.x = snapped.x;
			s.y = snapped.y;
		}

		// --------------------------------------------------------------
		// Guides
		// --------------------------------------------------------------

		// System guides
		if (guides.system.enabled) {
			let item = getCurrentProjectEditor().selectedItem;
			for (const guide of Object.values(guides.system.getAll(item))) {
				if (guide.enabled) {
					let snapped = guide.snap(point.x, point.y, d.z);
					if (snapped.xWithinLimit) s.x = snapped.x;
					if (snapped.yWithinLimit) s.y = snapped.y;
				}
			}
		}
		// Custom guide snap
		if (guides.custom.enabled) {
			for (const guide of guides.custom.guides) {
				if (guide.enabled) {
					let snapped = guide.snap(point.x, point.y, d.z);
					if (snapped.xWithinLimit) s.x = snapped.x;
					if (snapped.yWithinLimit) s.y = snapped.y;
				}
			}
		}

		log(`lock.x: ${lock.x}, lock.y: ${lock.y}`);
		if (!lock.x) {
			d.x = s.x;
		}
		if (!lock.y) {
			d.y = s.y;
		}
		return d;
	}
	/**
	 * @param {object} d - current offset + view zoom
	 * @param {ProjectEditor} editor - working editor
	 * @param {object} ehd - event handler data
	 */
	snapBoundingBox(d, editor, ehd) {
		const center = this.shapes.maxes.center;
		let corners = ehd.initial.maxes.corners;

		let bl = { x: corners[0].x - ehd.offset.x, y: corners[0].y - ehd.offset.y };
		// log(corners);
		this.point.x = ehd.initial.point.x - ehd.offset.x;
		this.point.y = ehd.initial.point.y - ehd.offset.y;

		// bl.x += d.x;
		// bl.y += d.y;
		// log(`offset: x: ${pOfs.x}, y: ${pOfs.y}`);
		this.snap(d, editor, ehd, bl);
		log(d);
	}
}
