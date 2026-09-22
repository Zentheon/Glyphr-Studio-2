import { getCurrentProjectEditor, getCurrentTheme } from '../../app/main.js';
import { round } from '../../common/functions.js';
import {
	closeAllNotations,
	makeAndShowPathAddPointNotation,
} from '../../controls/dialogs/dialogs.js';
import { cXsX, cYsY, sXcX, sYcY } from '../edit_canvas.js';
import { ehd } from '../events.js';
import { getShapeAtLocation, selectTool } from './tools.js';

/**
	// ----------------------------------------------------------------
	// Path Add Point - adds points to an existing path (Pen Plus)
	// ----------------------------------------------------------------
 */
export class Tool_PathAddPoint {
	constructor() {
		this.previewPoint = undefined;
	}
	mousedown(ev) {
		const editor = getCurrentProjectEditor();
		let singlePath = editor.multiSelect.shapes.singleton;
		let clickedShape = getShapeAtLocation(ehd.current.mouse.c.x, ehd.current.mouse.c.y);

		if (this.previewPoint && singlePath && singlePath.objType !== 'ComponentInstance') {
			let addedPoint = singlePath.insertPathPoint(
				this.previewPoint.point,
				this.previewPoint.split,
				ehd.isShiftDown
			);
			if (addedPoint) {
				editor.multiSelect.points.select(addedPoint);
				if (ehd.isShiftDown) addedPoint.roundAll(0);
				if (ehd.isCtrlDown) {
					addedPoint.h1.use = false;
					addedPoint.h2.use = false;
				}
				editor.publish('currentPathPoint', addedPoint);
				editor.publish('currentPath', singlePath);
				editor.history.addState('Added point to path');
			}
		} else if (clickedShape) {
			editor.multiSelect.points.clear();
			if (ehd.isCtrlDown) editor.multiSelect.shapes.add(clickedShape);
			else editor.multiSelect.shapes.select(clickedShape);
			if (clickedShape.objType === 'ComponentInstance') {
				selectTool('pathEdit');
				editor.publish('currentComponentInstance');
			} else {
				editor.publish('whichShapeIsSelected');
			}
			editor.nav.panel = 'Attributes';
		} else {
			editor.selectedTool = 'newPath';
			editor.publish('whichToolIsSelected', editor.selectedTool);
			ehd.currentToolHandler = editor.eventHandlers.tool_addPath;
			ehd.currentToolHandler.dragging = true;
			ehd.currentToolHandler.firstPoint = true;
			ehd.currentToolHandler.mousedown(ev);
		}

		ehd.hoverPoint = false;
	}

	mousemove() {
		const editor = getCurrentProjectEditor();
		const theme = getCurrentTheme().active;

		let singlePath = editor.multiSelect.shapes.singleton;
		if (singlePath) {
			let curvePoint = singlePath.findClosestPointOnCurve({
				x: ehd.current.mouse.s.x,
				y: ehd.current.mouse.s.y,
			});
			if (ehd.isShiftDown) {
				curvePoint.x = round(curvePoint.x);
				curvePoint.y = round(curvePoint.y);
			}
			if (curvePoint && curvePoint.distance < 20) {
				this.previewPoint = curvePoint;
				let canvasPoint = {
					x: sXcX(curvePoint.x) - theme.handleSize / 2,
					y: sYcY(curvePoint.y) - theme.handleSize / 2,
				};
				makeAndShowPathAddPointNotation(curvePoint);
				ehd.hoverPoint = canvasPoint;
			} else {
				this.previewPoint = false;
				ehd.hoverPoint = false;
				closeAllNotations();
			}
		} else {
			this.previewPoint = false;
			ehd.hoverPoint = false;
			closeAllNotations();
		}

		editor.editCanvas.redraw('pathAddPoint:mousemove');
	}

	mouseup() {}
}
