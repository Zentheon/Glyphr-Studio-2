import { getCurrentTheme, getGlyphrStudioApp } from '../app/main';
import { addAsChildren, insertAfter, makeElement, textToNode } from '../common/dom';
import { makeDirectCheckbox } from '../panels/cards';
import { THEME_MODES, themes } from '../project_data/theme';
import { makeOneSettingsRow } from './settings';

function makeThemeModeChooser(textBlockOptions, onModeChange) {
	let app = getGlyphrStudioApp();
	let wrapper = makeElement({ className: 'renderFlavorButtonWrapper' });

	Object.keys(THEME_MODES).forEach((modeID) => {
		let button = makeElement({
			tag: 'button',
			className: 'renderFlavorButton',
			innerHTML: THEME_MODES[modeID],
			attributes: { title: `Set theme mode to: ${THEME_MODES[modeID]}` },
		});
		if (modeID === app.userTheme.mode) button.setAttribute('selected', '');

		button.addEventListener('click', () => {
			// textBlockOptions.previewFlavor = modeID;
			app.userTheme.mode = modeID;
			getCurrentTheme().changeMode(modeID);
			wrapper.querySelectorAll('.renderFlavorButton').forEach((otherButton) => {
				otherButton.removeAttribute('selected');
			});
			button.setAttribute('selected', '');

			if (onModeChange) onModeChange();
			app.saveThemeSettings();
		});
		wrapper.appendChild(button);
	});

	let row = [
		textToNode('<label class="settings__label">Theme mode</label>'),
		makeElement({
			tag: 'info-bubble',
			content: `silly me`,
		}),
		wrapper,
	];

	return row;
}

function makeThemeChooser() {
	let app = getGlyphrStudioApp();
	let userTheme = app.userTheme;
	let theme = getCurrentTheme();
	let optionChooser = makeElement({
		tag: 'option-chooser',
		attributes: {
			'selected-name': theme.name,
			'selected-id': theme.id,
		},
	});
	let option;

	Object.entries(themes).forEach(([id, entry]) => {
		option = makeElement({
			tag: 'option',
			innerHTML: entry.name,
			attributes: { note: `test!`, 'selected-name': entry.name, 'selected-id': id },
		});

		option.addEventListener('click', () => {
			theme.changeTheme(id);
		});

		optionChooser.appendChild(option);
	});

	return optionChooser;
}

function makeColorRow() {
	let row = [
		textToNode('<label class="settings__label">Primary</label>'),
		makeElement({
			tag: 'info-bubble',
			content: `silly me`,
		}),
		makeDirectCheckbox('test', 'dingus', undefined),
		makeElement({
			tag: 'input',
			className: 'guide-color-button',
			title: 'Set a custom color',
			attributes: {
				type: 'color',
				style: `background-color: black;`,
				value: 'white',
			},
		}),
		textToNode('<span></span>'),
		textToNode('<br>'),
	];
	return row;
}

/**
 * Makes the content for the Settings > Appearance tab
 * @returns {Element}
 */
export function makeSettingsTabContentAppearance() {
	const tabContent = makeElement({
		tag: 'div',
		className: 'settings-page__tab-content',
		id: 'tab-content__appearance',
		innerHTML: `
			<h1>Theme Settings</h1>
			<p>Adjust individual settings to your liking. Saves with project.</p>
		`,
	});

	const settingsArea = makeElement({
		tag: 'div',
		className: 'settings-table',
	});

	const importThemeButton = makeElement({
		tag: 'fancy-button',
		style: 'margin-bottom: 10px;',
		innerHTML: 'Import a theme',
		// onClick: importTheme,
	});
	importThemeButton.setAttribute('secondary', '');

	const exportThemeButton = makeElement({
		tag: 'fancy-button',
		style: 'margin-bottom: 10px;',
		innerHTML: 'Export current theme',
		// onClick: () => exportTheme,
	});
	exportThemeButton.setAttribute('minimal', '');

	addAsChildren(tabContent, [
		makeThemeModeChooser({}, undefined),
		textToNode('<br>'),
		makeThemeChooser(),
		textToNode('<br>'),
	]);

	addAsChildren(settingsArea, [
		textToNode('<h3>Overrides: Editor</h3>'),
		makeOneSettingsRow('appearance', 'handleSize'),
		makeColorRow(),
	]);

	addAsChildren(tabContent, settingsArea);
	return tabContent;
}
