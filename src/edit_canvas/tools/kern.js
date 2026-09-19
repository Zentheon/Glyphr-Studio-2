import { getCurrentProjectEditor } from '../../app/main.js';
import { round } from '../../common/functions.js';
import { eventHandlerData } from '../events.js';

/**
	// ----------------------------------------------------------------
	// Kern - moves the left kern group
	// ----------------------------------------------------------------
 */
export class Tool_Kern {
	constructor() {
		this.dragging = false;
		this.deltaX = 0;
	}

	mousedown() {
		// log('Tool_Kern - mouse down: ' + eventHandlerData.current.mouse.c.x + ':' + eventHandlerData.current.mouse.c.y);
		this.deltaX = eventHandlerData.current.mouse.c.x;
		this.dragging = true;
	}

	mouseup() {
		// log('Tool_Kern - Mouse Up');
		const editor = getCurrentProjectEditor();
		this.dragging = false;
		this.deltaX = 0;
		editor.history.addState('Kern group value: ' + editor.selectedKernGroup.value);
	}

	mousemove() {
		if (this.dragging) {
			// log('Tool_Kern - Mouse Move');
			// Moving paths if mousedown
			const editor = getCurrentProjectEditor();
			let value = 1 * editor.selectedKernGroup.value;
			let newValue = round(
				value + (1 * (eventHandlerData.current.mouse.c.x - this.deltaX)) / editor.view.dz
			);
			editor.selectedKernGroup.value = newValue;
			editor.publish('currentKernGroup', editor.selectedKernGroup);
			this.deltaX = eventHandlerData.current.mouse.c.x;
		}
	}
}
