import { getCurrentProjectEditor } from '../../app/main.js';
import { ehd } from '../events.js';

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
		this.deltaX = ehd.current.mouse.c.x - view.dx;
		this.deltaY = ehd.current.mouse.c.y - view.dy;
		// log(`this.delta: ${this.deltaX}, ${this.deltaY}`);
		ehd.isPanning = true;
	}

	mousemove() {
		if (ehd.isPanning) {
			// Moving paths if mousedown
			const editor = getCurrentProjectEditor();
			// log(`ehd.mouse: ${eventHandlerData.current.mouse.c.x}, ${eventHandlerData.current.mouse.c.y}`);
			// log(`this.delta: ${this.deltaX}, ${this.deltaY}`);

			let update = {
				dx: ehd.current.mouse.c.x - this.deltaX,
				dy: ehd.current.mouse.c.y - this.deltaY,
			};
			// log(update);
			editor.view = update;
			editor.publish('editCanvasView', editor.view);
		}
	}

	mouseup() {
		// log('PAN TOOL - Mouse Up');
		ehd.isPanning = false;
		this.deltaX = 0;
		this.deltaY = 0;
	}
}
