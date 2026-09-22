import { getCurrentProjectEditor } from '../app/main.js';
import { calculateAngle } from '../common/functions.js';
import { showToast } from '../controls/dialogs/dialogs.js';
import { Maxes } from '../project_data/maxes.js';
import { Grid } from '../project_editor/grid.js';
import { ProjectEditor } from '../project_editor/project_editor.js';
import { setCursor, updateCursor } from './cursors.js';
import { handleDropSVGonEditCanvas } from './events_drag_drop_paste.js';
import { handleKeyPress, handleKeyUp } from './events_keyboard.js';
import { handleMouseEvents, handleMouseWheel } from './events_mouse.js';
import { Tool_Kern } from './tools/kern.js';
import { Tool_NewBasicPath } from './tools/new_basic_path.js';
import { Tool_NewPath } from './tools/new_path.js';
import { Tool_Pan } from './tools/pan.js';
import { Tool_PathAddPoint } from './tools/path_add_point.js';
import { isAngleMoreHorizontal, Tool_PathEdit } from './tools/path_edit.js';
import { Tool_Resize } from './tools/resize.js';

// --------------------------------------------------------------
// Events - shared between Mouse and Keyboard
// --------------------------------------------------------------

export class EventHandlerData {
	constructor() {
		this.currentToolHandler = {};
		this.newBasicPathMaxes = {};
		this.newBasicPath = {};
		this.selecting = false;
		this.dragging = false;
		this.initial = {
			point: { x: 0, y: 0 },
			mouse: {
				c: { x: 0, y: 0 },
				s: { x: 0, y: 0 },
			},
			zoom: 0,
			/** @type {Maxes | null} */
			maxes: null,
		};
		this.last = {
			point: { x: 0, y: 0 },
			mouse: {
				c: { x: 0, y: 0 },
				s: { x: 0, y: 0 },
			},
			zoom: 0,
			/** @type {Maxes | null} */
			maxes: null,
		};
		this.current = {
			point: { x: 0, y: 0 },
			mouse: {
				c: { x: 0, y: 0 },
				s: { x: 0, y: 0 },
			},
			zoom: 0,
			/** @type {Maxes | null} */
			maxes: null,
		};
		this.lock = { x: false, y: false };
		this.snap = { titles: { x: '', y: '', all: '' } };
		this.handle = '';
		this.rotationStartCenter = {};
		this.rotationStartMaxesTopY = -100;
		this.rotateHandleHeight = 40;
		this.isMouseOverCanvas = false;
		this.corner = false;
		this.toolHandoff = false;
		this.undoQueueHasChanged = false;
		this.lastTool = false;
		this.isSpaceDown = false;
		this.isPanning = false;
		this.isShiftDown = false;
		this.isCtrlDown = false;
		this.isAltDown = false;
		this.hoverPoint = {};
		this.multi = false;
		/** @type {number | boolean} */
		this.canvasHotspotHovering = false;
		this.canvasHotspots = [];
		this.ctxType = null;
	}

	reset() {
		this.snap.titles = { x: '', y: '', all: '' };
	}

	/**
	 * Sets up the event listeners for a given edit canvas,
	 * and creates tools for each type of event handler.
	 * @param {Element} canvas
	 */
	initEventHandlers(canvas) {
		// log('initEventHandlers', 'start');
		// log(canvas);
		const editor = getCurrentProjectEditor();

		editor.eventHandlers.tool_pan = new Tool_Pan();
		editor.eventHandlers.tool_addRectOval = new Tool_NewBasicPath();
		editor.eventHandlers.tool_resize = new Tool_Resize();
		editor.eventHandlers.tool_addPath = new Tool_NewPath();
		editor.eventHandlers.tool_pathEdit = new Tool_PathEdit();
		editor.eventHandlers.tool_pathAddPoint = new Tool_PathAddPoint();
		editor.eventHandlers.tool_kern = new Tool_Kern();

		// Mouse Event Listeners
		canvas.addEventListener('mousedown', handleMouseEvents, false);
		canvas.addEventListener('mousemove', handleMouseEvents, false);
		canvas.addEventListener('mouseup', handleMouseEvents, false);
		canvas.addEventListener('mouseover', this.handleMouseOverCanvas);
		canvas.addEventListener('mouseout', this.handleMouseLeaveCanvas);
		canvas.addEventListener('wheel', handleMouseWheel, { passive: false, capture: false });
		canvas.addEventListener('drop', handleDropSVGonEditCanvas, false);
		canvas.addEventListener('dragenter', this.handleDragEnterCanvas, false);
		canvas.addEventListener('dragover', this.cancelDefaultEventActions, false);
		canvas.addEventListener('drag', this.cancelDefaultEventActions, false);

		// Document Key Listeners
		document.addEventListener('keydown', handleKeyPress, false);
		document.addEventListener('keyup', handleKeyUp, false);
		// log(`initEventHandlers`, 'end');
	}

	/**
	 * Do stuff when the mouse goes over the Edit Canvas
	 */
	handleMouseOverCanvas() {
		// log('handleMouseOverCanvas', 'start');
		this.isMouseOverCanvas = true;
		updateCursor();
		// log('handleMouseOverCanvas', 'end');
	}

	/**
	 * Do stuff when the mouse leaves the Edit Canvas
	 */
	handleMouseLeaveCanvas() {
		// log('handleMouseLeaveCanvas', 'start');
		this.isMouseOverCanvas = false;
		// Fixes a Chrome cursor problem
		document.onselectstart = function () {};
		updateCursor();
		// log('handleMouseLeaveCanvas', 'end');
	}

	/**
	 * Do stuff when the user drags a file over the Edit Canvas
	 * @param {DragEvent} event - drag event
	 */
	handleDragEnterCanvas(event) {
		event.preventDefault();
		event.stopPropagation();
		showToast('Drop a SVG file to import it');
	}

	/**
	 * Switch the Edit Canvas to pan mode
	 * @param {Event} event - mouse event
	 */
	togglePanOn(event) {
		const editor = getCurrentProjectEditor();
		editor.eventHandlers.tool_pan.mousedown(event);
		this.lastTool = editor.selectedTool;
		editor.selectedTool = 'pan';
		this.isPanning = true;
		editor.publish('whichToolIsSelected', editor.selectedTool);
		setCursor('move');
	}

	/**
	 * Switch the Edit Canvas out of pan mode
	 * @param {Event} event - mouse event
	 */
	togglePanOff(event) {
		const editor = getCurrentProjectEditor();
		editor.eventHandlers.tool_pan.mouseup(event);
		editor.selectedTool = editor.nav.page === 'Kerning' ? 'kern' : this.lastTool;
		this.lastTool = false;
		this.isPanning = false;
		updateCursor();
		editor.publish('whichToolIsSelected', editor.selectedTool);
	}

	/**
	 * Stops default event stuff from happening,
	 * so we can do custom stuff.
	 * @param {Event} event - input event
	 * @returns {false} - as per event spec
	 */
	cancelDefaultEventActions(event) {
		// log(`cancelDefaultEventActions`, 'start');
		// log(event);
		if (event.preventDefault) event.preventDefault();
		if (event.stopPropagation) event.stopPropagation();
		// log(`cancelDefaultEventActions`, 'end');
		return false;
	}

	// --------------------------------------------------------------
	// Snapping
	// --------------------------------------------------------------

	/**
	 * @param {number } x
	 * @param {number} y
	 * @param {ProjectEditor} editor - working editor
	 */
	snapPoint(
		x = this.current.point.x,
		y = this.current.point.y,
		editor = getCurrentProjectEditor()
	) {
		let result = { x, y };

		if (this.isAltDown) {
			// No regular snapping while alt is held
			return result;
		}

		let tmp = { x: result.x, y: result.y };
		let guides = editor.project.settings.guides;

		// grids
		if (guides.grids.enabled && guides.grids.snap && !this.isAltDown) {
			let grid = new Grid();
			grid.settings.x.size = editor.project.settings.font.upm / 10;
			grid.settings.y.size = editor.project.settings.font.upm / 10;

			let snapped = grid.snap(x, y, this.current.zoom);
			tmp.x = snapped.x;
			tmp.y = snapped.y;
			if (snapped.xHit && snapped.yHit) this.snap.titles.all = 'grid intersection';
			if (snapped.xHit) this.snap.titles.x = 'vertical grid line';
			if (snapped.yHit) this.snap.titles.y = 'horizontal grid line';
		}

		// System guide snap
		if (guides.system.enabled) {
			let item = getCurrentProjectEditor().selectedItem;
			for (const guide of Object.values(guides.system.getAll(item))) {
				if (guide.enabled) {
					let snapped = guide.snap(x, y, this.current.zoom);
					if (snapped.xHit) {
						tmp.x = snapped.x;
						this.snap.titles.x = guide.name;
					}
					if (snapped.yHit) {
						tmp.y = snapped.y;
						this.snap.titles.y = guide.name;
					}
				}
			}
		}
		// Custom guide snap
		if (guides.custom.enabled) {
			for (const guide of guides.custom.guides) {
				if (guide.enabled) {
					let snapped = guide.snap(x, y, this.current.zoom);
					if (snapped.xHit) {
						tmp.x = snapped.x;
						this.snap.titles.x = guide.name;
					}
					if (snapped.yHit) {
						tmp.y = snapped.y;
						this.snap.titles.y = guide.name;
					}
				}
			}
		}

		// log(`lock.x: ${this.lock.x}, lock.y: ${this.lock.y}`);
		if (!this.lock.x) result.x = tmp.x;
		if (!this.lock.y) result.y = tmp.y;

		return result;
	}
	/**
	 * @param {ProjectEditor} editor - working editor
	 */
	snapBoundingBox(editor = getCurrentProjectEditor()) {
		let result = this.current.point;
		let corners = this.initial.maxes.corners;

		// log(corners);
		let offset = this.current.offset;
		let snapped;
		for (let i = 0; i < corners.length; i++) {
			let c = corners[i];
			if (i !== 0) continue;
			c.x -= offset.x;
			c.y -= offset.y;
			snapped = this.snapPoint(c.x, c.y, editor);
			if (!this.lock.x) result.x = this.current.point.x - (c.x - snapped.x);
			if (!this.lock.y) result.y = this.current.point.y - (c.y - snapped.y);
		}

		return result;
	}

	axisLock(x = this.current.point.x, y = this.current.point.y, editor = getCurrentProjectEditor()) {
		let result = { x, y };

		this.lock = { x: false, y: false };
		if (this.isShiftDown) {
			// Check for locking to horizontal/vertical
			if (!this.ctxType?.startsWith('h') || this.isCtrlDown) {
				const base = { x: this.initial.point.x, y: this.initial.point.y };
				const ang = calculateAngle({ x, y }, base);
				if (isAngleMoreHorizontal(ang)) {
					// Point is moving more horizontal, lock to mouse y
					// log(`locking to y`);
					this.lock.y = true;
					result.y = this.initial.point.y;
					this.snap.titles.y = 'Horizontal lock';
				} else {
					// Point is moving more vertical, lock to mouse x
					// log(`locking to x`);
					this.lock.x = true;
					result.x = this.initial.point.x;
					this.snap.titles.x = 'Vertical lock';
				}
			} else if (typeof this.initial.point?.angle === 'number') {
				this.lock = { x: true, y: true };
				let initial = this.initial.point;
				// log(`Initial point angle: ${initial.angle}`);
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
				this.snap.titles.all = 'Angle lock';
			}
		}
		return result;
	}
}

export const ehd = new EventHandlerData();
