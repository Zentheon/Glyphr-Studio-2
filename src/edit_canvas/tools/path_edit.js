import { getCurrentProjectEditor } from '../../app/main.js';
import { calculateAngle, radiansToNiceAngle } from '../../common/functions.js';
import { refreshPanel } from '../../panels/panels.js';
import { Snap } from '../../project_editor/snap.js';
import { findAndCallHotspot } from '../context_characters.js';
import { setCursor } from '../cursors.js';
import { isOverControlPoint } from '../detect_edit_affordances.js';
import { cXsX, cYsY } from '../edit_canvas.js';
import { eventHandlerData } from '../events.js';
import { checkForMouseOverHotspot, clickEmptySpace, selectItemsInArea } from '../events_mouse.js';
import { getShapeAtLocation, isPointNearShapeEdge } from './tools.js';

/**
	// ----------------------------------------------------------------
	// Path Edit - selects points and moves points and handles (Pen)
	// ----------------------------------------------------------------
 */
export class Tool_PathEdit {
	constructor() {
		this.dragging = false;
		/** @type {Object | Boolean} */
		this.overCurve = false;
		this.draggingCurve = false;
		eventHandlerData.selecting = false;
		this.monitorForDeselect = false;
		this.controlPoint = {};
		this.pathPoint = {};
		this.historyTitle = 'Path edit tool';
		/** @type {Object | null} */
		eventHandlerData.initialPoint = null;
	}

	mousedown() {
		// log('Tool_PathEdit.mousedown', 'start');
		const ehd = eventHandlerData;
		const editor = getCurrentProjectEditor();
		const msPoints = editor.multiSelect.points;
		const msShapes = editor.multiSelect.shapes;
		const view = editor.view;
		ehd.lastX = ehd.mousePosition.x;
		ehd.firstX = ehd.mousePosition.x;
		ehd.lastY = ehd.mousePosition.y;
		ehd.firstY = ehd.mousePosition.y;
		this.historyTitle = 'Path edit tool';

		const clickedPath = getShapeAtLocation(ehd.mousePosition.x, ehd.mousePosition.y);

		// log(`getShapeAtLocation:`);
		// log(clickedPath);

		let checkPoints = ehd.isCtrlDown ? editor.selectedItem : msShapes.allPathPoints;
		let clickDetection = isOverControlPoint(
			checkPoints,
			cXsX(ehd.mousePosition.x, view),
			cYsY(ehd.mousePosition.y, view)
		);

		if (clickDetection) {
			// log(`\n⮟clickDetection⮟`);
			// log(clickDetection);
			this.pathPoint = clickDetection.pathPoint;
			if (clickDetection.controlPoint === 'p') this.controlPoint = clickDetection.pathPoint.p;
			if (clickDetection.controlPoint === 'h1') this.controlPoint = clickDetection.pathPoint.h1;
			if (clickDetection.controlPoint === 'h2') this.controlPoint = clickDetection.pathPoint.h2;
		}
		this.setInitialPoint();
		log(`set initial point x: ${ehd.initialPoint.x}, y: ${ehd.initialPoint.x}`);

		if (this.controlPoint?.type) {
			// log('detected CONTROL POINT');
			this.dragging = true;
			const isPathPointSelected = msPoints.isSelected(this.pathPoint);

			if (this.controlPoint.type === 'p') {
				// log('detected P');

				if (ehd.isCtrlDown) {
					// log('Multi Select Mode');
					if (isPathPointSelected) {
						// If we don't drag the points, deselect on mouseup
						this.monitorForDeselect = true;
					} else {
						msPoints.add(this.pathPoint);
						editor.selectPathsThatHaveSelectedPoints();
						this.historyTitle = `Moved ${msPoints.length} path points`;
					}
				} else {
					// log('Single Select Mode');
					if (isPathPointSelected) {
						// If we don't drag the point, deselect on mouseup
						this.monitorForDeselect = true;
					} else {
						msPoints.select(this.pathPoint);
						editor.selectPathsThatHaveSelectedPoints();
						this.historyTitle = `Moved path point: ${this.pathPoint.pointNumber}`;
					}
				}
			} else {
				// log('detected HANDLE');
				msPoints.singleHandle = this.controlPoint.type;
				this.historyTitle = `Moved path point: ${this.pathPoint.pointNumber} ${this.controlPoint.type}`;

				// log(`set ms.singleHandle: ${msPoints.singleHandle}`);
				// setCursor('penCircle');
			}

			// selectPathsThatHaveSelectedPoints();
		} else if (this.overCurve) {
			// log('detected CURVE');
			this.draggingCurve = true;
			this.historyTitle = `Dragged the centerpoint of a curve after point ${this.overCurve.point}.`;
		} else if (clickedPath) {
			// log('detected PATH');
			clickEmptySpace();
			msShapes.select(clickedPath);
			ehd.selecting = true;
			this.overCurve = false;
			this.draggingCurve = false;
		} else {
			// log('detected NOTHING');
			if (!ehd.isCtrlDown) clickEmptySpace();
			const clickedHotspot = findAndCallHotspot(ehd.mousePosition.x, ehd.mousePosition.y);
			if (!clickedHotspot) ehd.selecting = true;
			this.overCurve = false;
			this.draggingCurve = false;
		}

		// if (msShapes.members.length) editor.nav.panel = 'Attributes';
		// log('Tool_PathEdit.mousedown', 'end');
	}

	mousemove() {
		// log('Tool_PathEdit.mousemove', 'start');
		const ehd = eventHandlerData;
		const editor = getCurrentProjectEditor();
		const msPoints = editor.multiSelect.points;
		const view = editor.view;
		const snap = new Snap();
		snap.point.parent = this.controlPoint.parent;
		snap.point.x = this.controlPoint.x;
		snap.point.y = this.controlPoint.y;
		ehd.ctxType = this.controlPoint.type;

		// An easing function based on quint 'ease-in-out'
		function calculateWeight(x) {
			let weight = 1;
			if (x < 0.5) weight = 16 * x * x * x * x * x;
			else weight = 1 - Math.pow(-2 * x + 2, 5) / 2;
			return weight;
		}

		if (ehd.toolHandoff) {
			ehd.toolHandoff = false;
			this.controlPoint = msPoints.singleton.h2;

			this.controlPoint.parent.h2.use = true;
			this.controlPoint.parent.h2.x = cXsX(ehd.mousePosition.x, view);
			this.controlPoint.parent.h2.y = cYsY(ehd.mousePosition.y, view);
			msPoints.singleHandle = this.controlPoint.type;

			this.historyTitle = `Added new path: ${this.pathPoint.parent.name}`;
			this.dragging = true;

			// log('toolHandoff this.controlPoint = ');
			// log(this.controlPoint);
		}

		if (this.dragging) {
			// log('Dragging');
			// Moving points if mousedown
			this.monitorForDeselect = false;
			let d = {};
			d.x = (ehd.mousePosition.x - ehd.lastX) / view.dz;
			d.y = (ehd.lastY - ehd.mousePosition.y) / view.dz;
			d.z = view.dz;
			log(`dx: ${d.x}, dy: ${d.y}, dz: ${d.z}`);
			// log(`dragging with ms.singleHandle: ${msPoints.singleHandle}`);
			// log(`cpt: ${cpt}`);

			if (msPoints.members.length === 1) {
				if (ehd.ctxType === 'p') {
					this.historyTitle = `Moved path point: ${this.pathPoint.pointNumber}`;
				}

				log(`nonconv: ${this.controlPoint.x}`);
				log(`x: ${this.controlPoint.x - cXsX(ehd.mousePosition.x)}`);
				snap.snap(d, editor, ehd);

				// --------------------------------------------------------------
				// Locking
				// --------------------------------------------------------------
				if (this.controlPoint && this.controlPoint.xLock) d.x = 0;
				if (this.controlPoint && this.controlPoint.yLock) d.y = 0;
			} else {
				if (ehd.ctxType === 'p') {
					this.historyTitle = `Moved ${msPoints.members.length} path points`;
				}
			}

			// log(`dx: ${dx}, dy: ${dy}`);
			msPoints.updatePathPointPosition(d.x, d.y);

			ehd.lastX = ehd.mousePosition.x;
			ehd.lastY = ehd.mousePosition.y;
			ehd.undoQueueHasChanged = true;
			editor.publish(`currentPathPoint`, this.controlPoint.parent);
			editor.publish('currentItem', editor.selectedItem);
		} else if (ehd.selecting) {
			selectItemsInArea(
				ehd.lastX,
				ehd.lastY,
				ehd.mousePosition.x,
				ehd.mousePosition.y,
				'pathPoints'
			);
			editor.editCanvas.redraw('pathEdit:mousemove');
		} else if (this.draggingCurve) {
			// Get the current path and path points
			const parent = editor.multiSelect.shapes.singleton;
			const p1 = parent.pathPoints[this.overCurve.point];
			const nextPointNumber = parent.getNextPointNumber(p1.pointNumber);
			const p2 = parent.pathPoints[nextPointNumber];

			// Select the points
			editor.multiSelect.points.clear();
			editor.multiSelect.points.add(p1);
			editor.multiSelect.points.add(p2);

			// Make the updates
			let dx = (ehd.mousePosition.x - ehd.lastX) / view.dz;
			let dy = (ehd.lastY - ehd.mousePosition.y) / view.dz;

			if (!p1.h2.use && !p2.h1.use) {
				// It's a line segment
				p1.updatePathPointPosition('p', dx, dy);
				p2.updatePathPointPosition('p', dx, dy);
			} else {
				// It's a curve
				let t = this.overCurve.split || 0.5;
				let weight = calculateWeight(t);
				// log(`weight: ${weight}`);

				let offsetP1 = (1 - weight) / (3 * t * (1 - t) * (1 - t));
				let offsetP2 = weight / (3 * t * t * (1 - t));

				p1.updatePathPointPosition(
					'h2',
					p1.h2.xLock ? 0 : offsetP1 * dx,
					p1.h2.yLock ? 0 : offsetP1 * dy
				);
				p2.updatePathPointPosition(
					'h1',
					p2.h1.xLock ? 0 : offsetP2 * dx,
					p2.h1.yLock ? 0 : offsetP2 * dy
				);
			}

			// Finish up
			ehd.lastX = ehd.mousePosition.x;
			ehd.lastY = ehd.mousePosition.y;
			ehd.undoQueueHasChanged = true;
			editor.publish(`currentPath`, parent);
			editor.publish('currentItem', editor.selectedItem);
		} else {
			const editor = getCurrentProjectEditor();
			if (editor.project.settings.app.directlyDragCurves) {
				this.overCurve = false;
				let singleShape = editor.multiSelect.shapes.singleton;
				if (singleShape && singleShape.objType !== 'ComponentInstance') {
					let mousePoint = eventHandlerData.mousePosition;
					if (isPointNearShapeEdge(singleShape, mousePoint.x, mousePoint.y)) {
						let curvePoint = singleShape.findClosestPointOnCurve({
							x: cXsX(mousePoint.x),
							y: cYsY(mousePoint.y),
						});
						this.overCurve = curvePoint;
						// log(`\t⮟this.overCurve⮟`);
						// log(this.overCurve);
					}
				}
			}
		}

		checkForMouseOverHotspot(ehd.mousePosition.x, ehd.mousePosition.y);

		// Figure out cursor
		let hoverDetection;
		let hcpIsSelected;

		if (ehd.isCtrlDown && !ehd.isShiftDown) {
			// Multi-selection

			hoverDetection = isOverControlPoint(
				editor.selectedItem,
				cXsX(ehd.mousePosition.x, view),
				cYsY(ehd.mousePosition.y, view)
			);
			hcpIsSelected = hoverDetection && msPoints.isSelected(hoverDetection.pathPoint);

			if (hoverDetection.controlPoint === 'p') {
				// Hovered over a Point
				if (hcpIsSelected) {
					// Point is selected
					// log(`CTRL DOWN > Selected P`);
					setCursor('penSquareMinus');
				} else {
					// Point is not selected
					// log(`CTRL DOWN > Not selected P`);
					setCursor('penSquarePlus');
				}
			} else {
				// Not hovering over anything
				// log(`CTRL DOWN > Not P`);
				setCursor('penPlus');
			}
		} else {
			// Single selection
			hoverDetection = isOverControlPoint(
				editor.multiSelect.shapes.allPathPoints,
				cXsX(ehd.mousePosition.x, view),
				cYsY(ehd.mousePosition.y, view)
			);
			hcpIsSelected = hoverDetection && msPoints.isSelected(hoverDetection.pathPoint);
			if (hoverDetection.controlPoint === 'p') {
				// Hovered over a point
				setCursor('penSquare');
			} else if (msPoints.singleton && hcpIsSelected) {
				// Hovered over a handle
				setCursor('penCircle');
			} else if (this.overCurve) {
				// Hovering over curve
				setCursor('penCurve');
			} else {
				// Not hovering over anything
				setCursor('pen');
			}
		}

		// log('Tool_PathEdit.mousemove', 'end');
	}

	mouseup() {
		// log('Tool_PathEdit.mouseup', 'start');
		const ehd = eventHandlerData;
		const editor = getCurrentProjectEditor();
		const msPoints = editor.multiSelect.points;
		// const msShapes = editor.multiSelect.shapes;

		if (this.monitorForDeselect) {
			msPoints.remove(this.pathPoint);
		}

		if (ehd.undoQueueHasChanged) {
			editor.history.addState(this.historyTitle);
			ehd.undoQueueHasChanged = false;
		}

		if (ehd.selecting) {
			ehd.selecting = false;
			refreshPanel();
			editor.editCanvas.redraw('pathEdit:mouseup');
		}

		// set to defaults
		this.dragging = false;
		this.overCurve = false;
		this.draggingCurve = false;
		ehd.selecting = false;
		this.controlPoint = false;
		this.pathPoint = false;
		this.monitorForDeselect = false;
		ehd.initialPoint = null;
		ehd.toolHandoff = false;
		msPoints.singleHandle = false;
		ehd.lastX = -100;
		ehd.lastY = -100;
		ehd.firstX = -100;
		ehd.firstY = -100;

		editor.publish('currentItem', editor.selectedItem);
		// log('Tool_PathEdit.mouseup', 'end');
	}

	setInitialPoint() {
		const ehd = eventHandlerData;
		if (ehd.initialPoint !== null) return;
		// log(`Tool_PathEdit.setInitialPoint`, 'start');
		ehd.initialPoint = {};
		const handle = this.controlPoint?.parent?.[this.controlPoint.type];
		ehd.initialPoint.angle = handle ? calculateAngle(handle, handle.parent.p) : 0;

		ehd.initialPoint.x = this.controlPoint.x;
		ehd.initialPoint.y = this.controlPoint.y;
		ehd.initialPoint.baseX = this.controlPoint?.parent?.p?.x;
		ehd.initialPoint.baseY = this.controlPoint?.parent?.p?.y;
		// log(`angle: ${ehd.initialPoint.angle}`);
		// log(`point: ${ehd.initialPoint.x}, ${ehd.initialPoint.y}`);
		// log(`base: ${ehd.initialPoint.baseX}, ${ehd.initialPoint.baseY}`);
		// log(`Tool_PathEdit.setInitialPoint`, 'end');
	}
}

/**
 *
 * @param {Number} angle - in radians
 * @returns {Boolean} - true if angle is more horizontal
 */
export function isAngleMoreHorizontal(angle) {
	const ang = radiansToNiceAngle(angle);
	return (ang >= 45 && ang <= 135) || (ang >= 225 && ang <= 315);
}
