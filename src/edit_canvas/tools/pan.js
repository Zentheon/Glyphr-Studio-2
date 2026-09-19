import { getCurrentProjectEditor } from '../../app/main.js';
import { eventHandlerData } from '../events.js';

/**
	// ----------------------------------------------------------------
	// Pan - moves the canvas view
	// ----------------------------------------------------------------
 */
export class Tool_Pan {
	constructor() {
		this.deltaX = 0;
		this.deltaY = 0;
	}
	mousedown() {
		// log('PAN TOOL - mouse down: ' + eventHandlerData.current.mouse.c.x + ':' + eventHandlerData.current.mouse.c.y);
		const editor = getCurrentProjectEditor();
		let view = editor.view;
		this.deltaX = eventHandlerData.current.mouse.c.x - view.dx;
		this.deltaY = eventHandlerData.current.mouse.c.y - view.dy;
		// log(`this.delta: ${this.deltaX}, ${this.deltaY}`);
		eventHandlerData.isPanning = true;
	}

	mousemove() {
		if (eventHandlerData.isPanning) {
			// Moving paths if mousedown
			const editor = getCurrentProjectEditor();
			// log(`ehd.mouse: ${eventHandlerData.current.mouse.c.x}, ${eventHandlerData.current.mouse.c.y}`);
			// log(`this.delta: ${this.deltaX}, ${this.deltaY}`);

			let update = {
				dx: eventHandlerData.current.mouse.c.x - this.deltaX,
				dy: eventHandlerData.current.mouse.c.y - this.deltaY,
			};
			// log(update);
			editor.view = update;
			editor.publish('editCanvasView', editor.view);
		}
	}

	mouseup() {
		// log('PAN TOOL - Mouse Up');
		eventHandlerData.isPanning = false;
		this.deltaX = 0;
		this.deltaY = 0;
	}
}
