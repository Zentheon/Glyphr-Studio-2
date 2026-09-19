import { getCurrentProjectEditor } from '../../app/main.js';
import { calculateAngle, clone } from '../../common/functions.js';
import { refreshPanel } from '../../panels/panels.js';
import { isMaxes } from '../../project_data/maxes.js';
import { Snap } from '../../project_editor/snap.js';
import { findAndCallHotspot } from '../context_characters.js';
import { setCursor } from '../cursors.js';
import { cXsX, cYsY } from '../edit_canvas.js';
import { eventHandlerData } from '../events.js';
import {
	checkForMouseOverHotspot,
	clickEmptySpace,
	resizePath,
	selectItemsInArea,
} from '../events_mouse.js';
import { isAngleMoreHorizontal } from './path_edit.js';
import { getShapeAtLocation, isSideBearingHere } from './tools.js';

/**
	// ----------------------------------------------------------------
	// Resize - resizes whole paths (Arrow / Pointer)
	// ----------------------------------------------------------------
 */
export class Tool_Resize {
	constructor() {
		this.dragging = false;
		this.resizing = false;
		this.rotating = false;
		/** @type {String | false} */
		this.sideBearingEdit = false;
		/** @type {String | false} */
		this.sideBearingHover = false;
		eventHandlerData.selecting = false;
		this.monitorForDeselect = false;
		this.didStuff = false;
		/** @type {Object | null} */
		this.clickedShape = null;
		this.historyTitle = 'Path resize tool';
		eventHandlerData.handle = '';
	}

	mousedown() {
		// log(`Tool_Resize.mousedown`, 'start');
		// log('x:y ' + eventHandlerData.mousePosition.x + ':' + eventHandlerData.mousePosition.y);
		const editor = getCurrentProjectEditor();
		const msShapes = editor.multiSelect.shapes;
		const ehd = eventHandlerData;
		ehd.handle = '';
		ehd.lastX = ehd.mousePosition.x;
		ehd.firstX = ehd.mousePosition.x;
		ehd.lastY = ehd.mousePosition.y;
		ehd.firstY = ehd.mousePosition.y;
		ehd.handle = msShapes.isOverBoundingBoxHandle(ehd.mousePosition.x, ehd.mousePosition.y) || '';

		this.didStuff = false;
		this.clickedShape = getShapeAtLocation(ehd.mousePosition.x, ehd.mousePosition.y);
		this.sideBearingEdit = isSideBearingHere(
			ehd.mousePosition.x,
			ehd.mousePosition.y,
			editor.selectedItem
		);
		this.sideBearingHover = this.sideBearingEdit;
		this.resizing = false;
		this.dragging = false;
		this.rotating = false;
		ehd.selecting = false;

		// log('clickedShape: ' + this.clickedShape);
		// log('corner: ' + ehd.handle);

		if (ehd.handle) {
			if (ehd.handle === 'rotate') {
				// log('mousedown - setting rotating = true');
				this.rotating = true;
				ehd.rotationStartCenter = clone(msShapes.maxes.center);
				// log(`center.x: ${ehd.rotationStartCenter.x}`);
				// log(`center.y: ${ehd.rotationStartCenter.y}`);
				ehd.rotationStartMaxesTopY = cYsY(ehd.mousePosition.y);
				// log(`ehd.rotationStartMaxesTopY: ${ehd.rotationStartMaxesTopY}`);
				this.historyTitle = 'Rotated shape';
			} else {
				// log('clicked on ehd.handle: ' + ehd.handle);
				this.resizing = true;
			}
			setCursor(ehd.handle);
		} else if (this.clickedShape) {
			if (ehd.isCtrlDown) {
				if (msShapes.isSelected(this.clickedShape)) {
					// If we don't drag this shape, then deselect it on mouseup
					this.monitorForDeselect = true;
				} else {
					msShapes.add(this.clickedShape);
				}
			} else {
				if (msShapes.isSelected(this.clickedShape)) {
					// If we don't drag this shape, then deselect it on mouseup
					this.monitorForDeselect = true;
				} else {
					msShapes.select(this.clickedShape);
				}
			}

			// 	if (this.clickedShape.objType === 'ComponentInstance') selectTool('pathEdit');
			// 	editor.nav.panel = 'Attributes';
			// }

			this.setInitialPoint();

			this.dragging = true;
		} else {
			// log('clicked on nothing');
			if (!ehd.isCtrlDown) clickEmptySpace();
			const clickedHotspot = findAndCallHotspot(ehd.mousePosition.x, ehd.mousePosition.y);
			if (!clickedHotspot && !this.sideBearingEdit) ehd.selecting = true;
		}
		// log(`Tool_Resize.mousedown`, 'end');
	}

	mousemove() {
		// log(`Tool_Resize.mousemove`, 'start');

		const ehd = eventHandlerData;
		const editor = getCurrentProjectEditor();
		const view = editor.view;
		const msShapes = editor.multiSelect.shapes;
		const snap = new Snap();
		this.didStuff = false;
		const corner =
			ehd.handle || msShapes.isOverBoundingBoxHandle(ehd.mousePosition.x, ehd.mousePosition.y);
		const singlePath = msShapes.singleton;

		// log(`this.sideBearingEdit: ${this.sideBearingEdit}`);
		if (this.dragging) {
			// log('detected DRAGGING');
			this.monitorForDeselect = false;

			// if (ehd.isShiftDown) this.setInitialPoint();

			const mouse = { x: cXsX(ehd.mousePosition.x), y: cYsY(ehd.mousePosition.y) };
			ehd.offset = {
				x: ehd.initial.mouse.x - mouse.x,
				y: ehd.initial.mouse.y - mouse.y,
			};
			let newPos = {
				x: ehd.initial.point.x - ehd.offset.x,
				y: ehd.initial.point.y - ehd.offset.y,
				z: view.dz,
			};
			// log(`newPos: x: ${newPos.x}, y: ${newPos.y}, z: ${newPos.z}`);
			// log(`offset: x: ${ehd.offset.x}, y: ${ehd.offset.y}`);

			if (singlePath) {
				if (singlePath.xLock) newPos.x = 0;
				if (singlePath.yLock) newPos.y = 0;
				this.historyTitle = `Moved shape: ${singlePath.name}`;
			} else {
				this.historyTitle = `Moved ${msShapes.members.length} shapes`;
			}

			snap.shapes = msShapes;
			snap.snapBoundingBox(newPos, editor, ehd);
			// Snapping
			// if (ehd.isShiftDown) {
			// 	log(`initial x: ${ehd.initialPoint.x}, y: ${ehd.initialPoint.y}`);
			// 	const mouseSX = cXsX(ehd.mousePosition.x);
			// 	const mouseSY = cYsY(ehd.mousePosition.y);
			// 	const mouse = { x: mouseSX, y: mouseSY };
			// 	const firstClick = { x: ehd.initialPoint.mouseSX, y: ehd.initialPoint.mouseSY };
			// 	const ang = calculateAngle(mouse, firstClick);
			// 	if (isAngleMoreHorizontal(ang)) {
			// 		// Point is moving more horizontal, snap to mouse y
			// 		d.x = mouse.x - this.clickedShape.x - (firstClick.x - ehd.initialPoint.x);
			// 		d.y = ehd.initialPoint.y - this.clickedShape.y;
			// 	} else {
			// 		// Point is moving more vertical, snap to mouse x
			// 		d.x = ehd.initialPoint.x - this.clickedShape.x;
			// 		d.y = mouse.y - this.clickedShape.y - (firstClick.y - ehd.initialPoint.y);
			// 	}
			// }

			msShapes.setShapePosition(newPos.x, newPos.y);
			this.monitorForDeselect = false;
			this.didStuff = true;
		} else if (this.resizing) {
			// log('detected RESIZING');
			resizePath();
			if (singlePath) {
				this.historyTitle = `Resized shape: ${singlePath.name}`;
			} else {
				this.historyTitle = `Resized ${msShapes.members.length} shapes`;
			}
			this.didStuff = true;
		} else if (this.rotating) {
			// log(`detected ROTATING`);
			let m = ehd.mousePosition;
			let center = ehd.rotationStartCenter;
			// log(`center.x: ${center.x}`);
			// log(`center.y: ${center.y}`);
			let a1 = calculateAngle({ x: cXsX(m.x), y: cYsY(m.y) }, center);
			let a2 = calculateAngle({ x: cXsX(ehd.lastX), y: cYsY(ehd.lastY) }, center);
			msShapes.rotate(a1 - a2, center);
			if (singlePath) {
				this.historyTitle = `Rotated shape: ${singlePath.name}`;
			} else {
				this.historyTitle = `Rotated ${msShapes.members.length} shapes`;
			}
			this.didStuff = true;
		} else if (this.sideBearingEdit) {
			// log(`detected SIDEBEARING ${this.sideBearingEdit}`);
			const dx = (ehd.mousePosition.x - ehd.lastX) / view.dz;
			const item = editor.selectedItem;
			if (this.sideBearingEdit === 'lsb') {
				const oldLSB = item.leftSideBearing;
				item.leftSideBearing = Math.round(item.leftSideBearing - dx);
				const deltaLSB = oldLSB - item.leftSideBearing;
				let view = editor.view;
				editor.view.dx += deltaLSB * view.dz;
				editor.publish('currentItem', item);
				this.historyTitle = `Updated left side bearing.`;
				this.didStuff = true;
			}
			if (this.sideBearingEdit === 'rsb') {
				item.rightSideBearing = Math.round(item.rightSideBearing + dx);
				this.historyTitle = `Updated right side bearing.`;
				this.didStuff = true;
			}
		} else if (ehd.selecting) {
			selectItemsInArea(ehd.lastX, ehd.lastY, ehd.mousePosition.x, ehd.mousePosition.y, 'shapes');
			editor.editCanvas.redraw('resize:mousemove');
		}

		// Figure out cursor
		const hoveredPath = getShapeAtLocation(ehd.mousePosition.x, ehd.mousePosition.y);
		const oldSBH = this.sideBearingHover;
		this.sideBearingHover = isSideBearingHere(
			ehd.mousePosition.x,
			ehd.mousePosition.y,
			editor.selectedItem
		);

		if (corner) {
			setCursor(corner);
		} else if (this.rotating) {
			setCursor('rotate');
		} else if (this.dragging) {
			setCursor('arrowSquare');
		} else if (ehd.isCtrlDown) {
			if (hoveredPath) {
				if (msShapes.isSelected(hoveredPath)) {
					setCursor('arrowSquareMinus');
				} else {
					setCursor('arrowSquarePlus');
				}
			} else {
				setCursor('arrowPlus');
			}
		} else if (this.sideBearingEdit || this.sideBearingHover) {
			setCursor('col-resize');
			editor.publish('editCanvasView', editor.selectedItem);
		} else {
			if (hoveredPath) {
				setCursor('arrowSquare');
			} else {
				setCursor('arrow');
			}
		}

		if (oldSBH !== this.sideBearingHover) editor.publish('editCanvasView', editor.selectedItem);

		checkForMouseOverHotspot(ehd.mousePosition.x, ehd.mousePosition.y);

		if (this.didStuff) {
			// log('did stuff');
			ehd.lastX = ehd.mousePosition.x;
			ehd.lastY = ehd.mousePosition.y;
			ehd.undoQueueHasChanged = true;
			editor.publish('currentItem', editor.selectedItem);
		} else {
			// log(`did NOT do stuff`);
		}

		// log(`Tool_Resize.mousemove`, 'end');
	}

	mouseup() {
		// log(`Tool_Resize.mouseup`, 'start');
		const ehd = eventHandlerData;
		const editor = getCurrentProjectEditor();

		// New Basic Path
		if (isMaxes(ehd.newBasicPathMaxes)) {
			ehd.newBasicPathMaxes = false;
			ehd.lastX = ehd.firstX;
			ehd.lastY = ehd.firstY;
			resizePath();
		}

		if (this.monitorForDeselect) {
			editor.multiSelect.shapes.remove(this.clickedShape);
		}

		if (ehd.selecting) {
			ehd.selecting = false;
			refreshPanel();
		}

		// Finish Up
		this.clickedShape = null;
		this.didStuff = false;
		this.dragging = false;
		this.resizing = false;
		this.sideBearingEdit = false;
		this.sideBearingHover = false;
		this.rotating = false;
		ehd.selecting = false;
		this.monitorForDeselect = false;
		ehd.handle = '';
		ehd.lastX = -100;
		ehd.lastY = -100;
		ehd.firstX = -100;
		ehd.firstY = -100;
		ehd.rotationStartCenter = false;
		ehd.rotationStartMaxesTopY = -100;
		if (ehd.undoQueueHasChanged) editor.history.addState(this.historyTitle);
		ehd.undoQueueHasChanged = false;
		editor.publish('currentItem', editor.selectedItem);
		// log(`Tool_Resize.mouseup`, 'end');
	}

	setInitialPoint() {
		const ehd = eventHandlerData;
		// log(`Tool_Resize.setInitialPoint`, 'start');
		if (this.clickedShape && typeof this.clickedShape === 'object') {
			log(`setting initial point`);
			ehd.initial.mouse.x = cXsX(ehd.mousePosition.x);
			ehd.initial.mouse.y = cYsY(ehd.mousePosition.y);

			ehd.initial.point.x = this.clickedShape.x;
			ehd.initial.point.y = this.clickedShape.y;

			ehd.initial.maxes = getCurrentProjectEditor().multiSelect.shapes.maxes;
			// ehd.initial.mouseSX = cXsX(ehd.mousePosition.x);
			// ehd.initial.mouseSY = cYsY(ehd.mousePosition.y);
		}

		// log(`shape: ${ehd.initialPoint.shapeX}, ${ehd.initialPoint.shapeY}`);
		// log(`mouse: ${ehd.initialPoint.mouseSX}, ${ehd.initialPoint.mouseSY}`);
		// log(`Tool_Resize.setInitialPoint`, 'end');
	}
}
