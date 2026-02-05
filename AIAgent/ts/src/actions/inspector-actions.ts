import { ui } from '@joint/plus';

import type { App } from '../app';
import type { Model } from '../diagram/types';

/**
 * HTML string for the inspector empty state, used when the inspector is closed.
 */
const INSPECTOR_PLACEHOLDER_HTML = `
    <div class="inspector-placeholder">
        <div class="inspector-placeholder-icon"></div>
        <span>Start by selecting an element or link</span>
    </div>
`;

/**
 * Opens the inspector for the given cell.
 */
export function openInspector(app: App, model: Model) {
    const { diagramData, inspectorContainerEl } = app;

    closeInspector(app);

    /**
     * @todo Could be moved to a custom Inspector view class.
     */
    inspectorContainerEl.classList.remove('inspector-closed');
    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content') as HTMLElement;
    const headerEl = inspectorContainerEl.querySelector('.inspector-header') as HTMLElement;
    const headerTextEl = headerEl.querySelector('.inspector-header-text') as HTMLElement;
    const headerIconEl = headerEl.querySelector('.inspector-header-icon') as HTMLImageElement;

    const {
        groups,
        inputs,
        headerText = '',
        headerIcon = '',
        ...inspectorOptions
    } = model.getInspectorConfig();

    headerEl.classList.remove('hidden');
    headerTextEl.textContent = headerText;
    headerIconEl.src = headerIcon;

    ui.Inspector.create(inspectorEl, {
        ...inspectorOptions,
        cell: diagramData,
        groups,
        inputs: {
            [model.getDataPath()]: inputs
        },
    });
}

/**
 * Closes the inspector if it is open.
 */
export function closeInspector(app: App) {
    const { inspectorContainerEl } = app;
    inspectorContainerEl.classList.add('inspector-closed');

    const headerEl = inspectorContainerEl.querySelector('.inspector-header') as HTMLElement;
    headerEl.classList.add('hidden');

    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content') as HTMLElement;
    inspectorEl.innerHTML = INSPECTOR_PLACEHOLDER_HTML;

    ui.Inspector.close();
}
