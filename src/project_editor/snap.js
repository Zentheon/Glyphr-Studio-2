import { calculateAngle } from '../common/functions';
import { cXsX, cYsY } from '../edit_canvas/edit_canvas';
import { isAngleMoreHorizontal } from '../edit_canvas/tools/path_edit';
import { Grid } from './grid';
import { ProjectEditor } from './project_editor';

/**
 * Snapping handler
 **/
export class Snap {
	constructor() {
		// log(`Grid.constructor`, 'start');
		this.objType = 'Snap';
		this.settings = {
			// snapLimitEdge: oa.snapLimitEdge || 0.5, // 0 to 1 grid cell range
			// snapLimitCorner: oa.snapLimitCorner || 20, // em, scaled by zoom. 0 always snaps
		};
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
		// log(`Grid.constructor`, 'end');
	}

	/**
	 * @param {object} d - current offset + view zoom
	 * @param {ProjectEditor} editor - working editor
	 * @param {object} ehd - event handler data
	 */
	snap(d, editor, ehd) {
		let axisLock = null;
		const mouse = { x: cXsX(ehd.mousePosition.x), y: cYsY(ehd.mousePosition.y) };

		// --------------------------------------------------------------
		// Axis lock
		// --------------------------------------------------------------
		const parentPoint = this.point.parent;
		if (ehd.isShiftDown) {
			// Check for locking to horizontal/vertical
			if (ehd.ctxType === 'p' || ehd.isCtrlDown) {
				const base = { x: ehd.initialPoint.baseX, y: ehd.initialPoint.baseY };
				const ang = calculateAngle(mouse, base);
				if (isAngleMoreHorizontal(ang)) {
					// Point is moving more horizontal, lock to mouse y
					log(`locking to y`);
					axisLock = 'y';
					d.x = mouse.x - this.point.x;
					d.y = ehd.initialPoint.baseY - this.point.y;
				} else {
					// Point is moving more vertical, lock to mouse x
					log(`locking to x`);
					axisLock = 'x';
					d.x = ehd.initialPoint.baseX - this.point.x;
					d.y = mouse.y - this.point.y;
				}
			} else if (typeof ehd.initialPoint?.angle === 'number') {
				// Snapping
				axisLock = 'x';
				axisLock = 'y';
				// Check for handle lock to original angle
				if (isAngleMoreHorizontal(ehd.initialPoint.angle)) {
					// Handle is more horizontal, lock to mouse x
					const base = this.point.x - parentPoint.x + d.x;
					const newY = base * Math.tan(ehd.initialPoint.angle) + parentPoint.y;
					d.y = newY - this.point.y;
				} else {
					// Handle is more vertical, lock to mouse y
					const base = this.point.y - parentPoint.y + d.y;
					const newX = base / Math.tan(ehd.initialPoint.angle) + parentPoint.x;
					d.x = newX - this.point.x;
				}
			}
		}

		if (ehd.isAltDown) {
			// No regular snapping while alt is held
			return d;
		}

		// Temporary offsets
		let s = { x: mouse.x - this.point.x, y: mouse.y - this.point.y };
		let guides = editor.project.settings.guides;

		// --------------------------------------------------------------
		// Grids
		// --------------------------------------------------------------

		if (guides.grids.enabled && guides.grids.snap && !ehd.isAltDown) {
			let grid = new Grid();
			grid.settings.x.size = editor.project.settings.font.upm / 10;
			grid.settings.y.size = editor.project.settings.font.upm / 10;

			let snapped = grid.snap(mouse.x, mouse.y, d.z);
			s.x = snapped.x - this.point.x;
			s.y = snapped.y - this.point.y;
		}

		// --------------------------------------------------------------
		// Guides
		// --------------------------------------------------------------

		// System guides
		if (guides.system.enabled) {
			// impl
		}
		// Custom guide snap
		if (guides.custom.enabled) {
			for (const guide of Object.values(guides.custom.guides)) {
				let snapped = guide.snap(mouse.x, mouse.y, d.z);
				if (snapped.xWithinLimit) s.x = snapped.x - this.point.x;

				if (snapped.yWithinLimit) s.y = snapped.y - this.point.y;
			}
			//s.x = x - this.point.x;
			//s.y = y - this.point.y;
		}

		log(`axisLock: ${axisLock}`);
		if (axisLock !== 'x') {
			d.x = s.x;
		}
		if (axisLock !== 'y') {
			d.y = s.y;
		}

		return d;
	}
}
