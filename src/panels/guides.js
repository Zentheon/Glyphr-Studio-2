import { getCurrentProject, getCurrentProjectEditor } from '../app/main.js';
import { makeRandomSaturatedColor, parseColorString, rgbToHex } from '../common/colors.js';
import { addAsChildren, makeElement } from '../common/dom.js';
import { round } from '../common/functions.js';
import { makeIcon } from '../common/graphics.js';
import { makeFancySlider } from '../controls/fancy-slider/fancy_slider.js';
import {
	Guide,
	guideColorDark,
	guideColorLight,
	guideColorMedium,
} from '../project_editor/guide.js';
import { makeActionButton } from './action_buttons.js';
import { makeDirectCheckbox, makeSingleInput, makeSingleLabel, rowPad } from './cards.js';
import { refreshPanel } from './panels.js';

// --------------------------------------------------------------
// Guides panel
// --------------------------------------------------------------

export function makePanel_Guides() {
	let viewOptionsCard = makeElement({
		className: 'panel__card guides-card__view-options',
		innerHTML: '<h3>View options</h3>',
	});
	const guides = getCurrentProject().settings.guides;
	const showSystem = guides.system.enabled;
	const showCustom = guides.custom.enabled;
	const showGrid = guides.grids.enabled;
	addAsChildren(viewOptionsCard, [
		makeDirectCheckbox(guides, 'drawOnTop', refreshGuideChange),
		makeElement({
			tag: 'label',
			style: 'grid-column: 2 / -1;',
			content: 'Draw guides over shapes',
		}),
	]);

	const enableSystemGuidesCheckbox = makeDirectCheckbox(guides.system, 'enabled');
	enableSystemGuidesCheckbox.addEventListener('change', () => {
		getCurrentProjectEditor().navigate();
	});
	addAsChildren(viewOptionsCard, [
		enableSystemGuidesCheckbox,
		makeElement({ tag: 'h4', content: 'Key metrics guides' }),
	]);
	if (showSystem) {
		addAsChildren(viewOptionsCard, [
			makeElement(),
			makeSingleLabel('Opacity'),
			makeFancySlider(guides.system.opacity, (newValue) => {
				guides.system.opacity = newValue;
				getCurrentProjectEditor().editCanvas.redraw('guides system opacity');
			}),
			makeElement(),
			makeSingleLabel('Show labels'),
			makeDirectCheckbox(guides.system, 'showLabels', refreshGuideChange),
			rowPad(),
		]);
	}

	const enableCustomGuidesCheckbox = makeDirectCheckbox(guides.custom, 'enabled');
	enableCustomGuidesCheckbox.addEventListener('change', () => {
		getCurrentProjectEditor().navigate();
	});
	addAsChildren(viewOptionsCard, [
		enableCustomGuidesCheckbox,
		makeElement({ tag: 'h4', content: 'Custom guides' }),
	]);
	if (showCustom) {
		addAsChildren(viewOptionsCard, [
			makeElement(),
			makeSingleLabel('Opacity'),
			makeFancySlider(guides.custom.opacity, (newValue) => {
				guides.custom.opacity = newValue;
				getCurrentProjectEditor().editCanvas.redraw('guides custom opacity');
			}),
			makeElement(),
			makeSingleLabel('Show labels'),
			makeDirectCheckbox(guides.custom, 'showLabels', refreshGuideChange),
			rowPad(),
		]);
	}

	const enableGridsCheckbox = makeDirectCheckbox(guides.grids, 'enabled');
	enableGridsCheckbox.addEventListener('change', () => {
		getCurrentProjectEditor().navigate();
	});
	addAsChildren(viewOptionsCard, [
		enableGridsCheckbox,
		makeElement({ tag: 'h4', content: 'Grids' }),
	]);
	if (showGrid) {
		addAsChildren(viewOptionsCard, [
			makeElement(),
			makeSingleLabel('Opacity'),
			makeFancySlider(guides.grids.opacity, (newValue) => {
				guides.grids.opacity = newValue;
				getCurrentProjectEditor().editCanvas.redraw('grid opacity');
			}),
		]);
	}

	let result = [viewOptionsCard];
	if (showSystem) result.push(makeSystemGuidesCard());
	if (showCustom) result.push(makeCustomGuidesCard());
	if (showGrid) result.push(makeGridCard());
	return result;
}

function refreshGuideChange() {
	refreshPanel();
	getCurrentProjectEditor().editCanvas.redraw('guides refresh');
}

export function makeSystemGuidesCard() {
	let systemCard = makeElement({
		className: 'panel__card guides-card__system',
		innerHTML: '<h3>Key metrics guides</h3>',
	});

	const editor = getCurrentProjectEditor();
	const guides = getCurrentProject().settings.guides.system.getAll(editor.selectedItem);
	for (let [key, guide] of Object.entries(guides)) {
		// Checkbox
		const viewCheckbox = makeDirectCheckbox(guide, 'enabled', (newValue) => {
			editor.editCanvas.redraw('guides system view toggle');
		});
		viewCheckbox.setAttribute('title', 'Show / hide guide');
		viewCheckbox.setAttribute('style', `accent-color: ${guide.color};`);

		// Angle icon
		let angleDisplay = makeElement({
			className: 'guide-system-angle',
			innerHTML: makeIcon({
				name: 'command_horizontalBar',
				color: guide.color,
			}),
		});
		angleDisplay.setAttribute('title', 'Horizontal guideline');
		if (guide.angle === 0) {
			angleDisplay.innerHTML = makeIcon({
				name: 'command_verticalBar',
				color: guide.color,
			});
			angleDisplay.setAttribute('title', 'Vertical guideline');
		}

		// Position value
		const valueDisplay = makeElement({
			className: 'guide-system-value',
			content: `${guide.position}`,
		});
		valueDisplay.setAttribute(
			'title',
			`Guide line position\nThese are based on this font's key metrics,\nwhich you can edit on the Font Settings page.`
		);

		addAsChildren(systemCard, [
			viewCheckbox,
			makeSingleLabel(guide.name),
			angleDisplay,
			valueDisplay,
		]);
	}

	return systemCard;
}

// --------------------------------------------------------------
// Custom
// --------------------------------------------------------------

function makeCustomGuidesCard() {
	let customCard = makeElement({
		className: 'panel__card guides-card__custom',
		innerHTML: '<h3>Custom guides</h3>',
	});

	const custom = getCurrentProject().settings.guides.custom;

	if (custom.guides.length) {
		custom.guides.forEach((guide, number) => {
			addAsChildren(customCard, makeCustomGuideRow(guide, number));
		});

		customCard.appendChild(rowPad());
	}

	const addGuideButton = makeElement({
		tag: 'fancy-button',
		attributes: { secondary: '' },
		innerHTML: 'Add a custom guide',
	});
	addGuideButton.addEventListener('click', () => {
		custom.guides.push(new Guide());
		refreshGuideChange();
	});

	customCard.appendChild(addGuideButton);
	return customCard;
}

function makeCustomGuideRow(guide, number) {
	// Checkbox
	const viewCheckbox = makeDirectCheckbox(guide, 'enabled', () => {
		const editor = getCurrentProjectEditor();
		editor.editCanvas.redraw('guides custom view toggle');
	});
	viewCheckbox.setAttribute('style', `accent-color: ${guide.color}`);
	viewCheckbox.setAttribute('title', 'Show / hide guide');

	// Name
	const nameInput = makeSingleInput(guide, 'name', 'editCanvasView', 'input');

	// Delete
	const deleteButton = makeActionButton({ iconName: 'delete', title: 'Delete guide' });
	deleteButton.setAttribute('class', 'guide-delete-button');
	deleteButton.addEventListener('click', () => {
		const guides = getCurrentProject().settings.guides.custom.guides;
		guides.splice(number, 1);
		refreshGuideChange();
	});

	const colorButton = makeElement({
		tag: 'input',
		className: 'guide-color-button',
		title: 'Change guide color',
		attributes: {
			type: 'color',
			style: `background-color: ${guide.color};`,
			value: rgbToHex(guide.color),
		},
	});
	colorButton.addEventListener('input', (event) => {
		// Get new color
		// @ts-expect-error 'property does exist'
		let rgb = parseColorString(event.target.value);
		let rgbString = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

		// Row accents
		colorButton.setAttribute('value', rgbToHex(rgbString));
		colorButton.style.backgroundColor = rgbString;
		viewCheckbox.style.accentColor = rgbString;
		angleButton.querySelector('g').setAttribute('fill', rgbString);

		// Update guide
		const guide = getCurrentProject().settings.guides.custom.guides[number];
		guide.color = rgbString;
		getCurrentProjectEditor().editCanvas.redraw('guides custom color change');
	});

	// Angle button
	const angleButton = makeElement({
		tag: 'button',
		title: 'Toggle vertical / horizontal',
		className: 'guide-angle-button',
		innerHTML: makeIcon({
			name: 'command_verticalBar',
			color: guide.color,
		}),
	});
	if (guide.angle === 90) {
		angleButton.innerHTML = makeIcon({
			name: 'command_horizontalBar',
			color: guide.color,
		});
	}
	angleButton.addEventListener('click', () => {
		const guide = getCurrentProject().settings.guides.custom.guides[number];
		if (guide.angle === 90) {
			guide.angle = 0;
			guide.name = guide.name.replace('Horizontal', 'Vertical');
		} else {
			guide.angle = 90;
			guide.name = guide.name.replace('Vertical', 'Horizontal');
		}
		refreshGuideChange();
	});

	// Position value
	const valueInput = makeSingleInput(guide, 'position', 'editCanvasView', 'input-number');
	valueInput.setAttribute('title', 'Guide line position');

	return [viewCheckbox, nameInput, deleteButton, colorButton, angleButton, valueInput];
}

function makeGridCard() {
	const grids = getCurrentProject().settings.guides.grids;
	const gridCard = makeElement({
		className: 'panel__card guides-card__grid',
		innerHTML: '<h3>Grid</h3>',
	});

	const gridSquareSize = makeElement({
		tag: 'code',
		innerHTML:
			'' + round(getCurrentProjectEditor().project.settings.font.upm / grids.divisions, 2) + ' Em',
	});
	// gridSquareSize.setAttribute('disabled', 'disabled');

	const valueInput = makeSingleInput(grids, 'divisions', 'editCanvasView', 'input-number');
	valueInput.addEventListener('change', () => {
		gridSquareSize.innerHTML =
			'' + round(getCurrentProjectEditor().project.settings.font.upm / valueInput.value, 2) + ' Em';
	});
	const divisionsContainer = makeElement({
		tag: 'span',
		className: 'divisions-container',
	});
	addAsChildren(divisionsContainer, [valueInput, gridSquareSize]);
	valueInput.setAttribute('title', 'Grid divisions');
	addAsChildren(gridCard, [
		makeElement(),
		makeSingleLabel(
			'Grid divisions',
			'For the Em square of this font, how many divisions should the grid have?'
		),
		divisionsContainer,
		makeElement(),
		makeSingleLabel(
			'Grid square size',
			'The size of each square in the grid, based on the number of divisions and the UPM of this font.'
		),
		gridSquareSize,
		makeSingleLabel(
			'Snap path points',
			'Snap path points to grid intersections when moving or creating points.'
		),
		makeDirectCheckbox(grids, 'snap', undefined),
		rowPad(),
	]);
	return gridCard;
}
