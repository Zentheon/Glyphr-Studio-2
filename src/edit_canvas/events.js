import { getCurrentProjectEditor } from '../app/main.js';
import { showToast } from '../controls/dialogs/dialogs.js';
import { Maxes } from '../project_data/maxes.js';
import { setCursor, updateCursor } from './cursors.js';
import { handleDropSVGonEditCanvas } from './events_drag_drop_paste.js';
import { handleKeyPress, handleKeyUp } from './events_keyboard.js';
import { handleMouseEvents, handleMouseWheel } from './events_mouse.js';
import { Tool_Kern } from './tools/kern.js';
import { Tool_NewBasicPath } from './tools/new_basic_path.js';
import { Tool_NewPath } from './tools/new_path.js';
import { Tool_Pan } from './tools/pan.js';
import { Tool_PathAddPoint } from './tools/path_add_point.js';
import { Tool_PathEdit } from './tools/path_edit.js';
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
		// mousePosition= {};
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
}

export const ehd = new EventHandlerData();
