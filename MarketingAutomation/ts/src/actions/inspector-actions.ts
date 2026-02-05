import { ui } from '@joint/plus';

import type { App } from '../app';
import type { Model } from '../diagram/types';
import { LabeledNode } from '../diagram/models';

/**
 * HTML string for the inspector empty state, used when the inspector is closed.
 */
const INSPECTOR_PLACEHOLDER_HTML = `
    <div class="inspector-placeholder">
        <div class="inspector-placeholder-icon"></div>
        <span>Start by selecting an element or link</span>
    </div>
`;

interface OpenInspectorOptions {
    openGroupName?: string;
}

/**
 * Opens the inspector for the given cell.
 * @param app - The application instance.
 * @param model - The model to open the inspector for.
 * @param options - The options object for the inspector.
 * @param options.openGroupName - The name of the group to open.
 */
export function openInspector(app: App, model: Model, { openGroupName }: OpenInspectorOptions = {}) {
    const { diagramData, inspectorContainerEl } = app;

    closeInspector(app);

    /**
     * @todo Could be moved to a custom Inspector view class.
     */
    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content') as HTMLElement;
    const headerEl = inspectorContainerEl.querySelector('.inspector-header') as HTMLElement;
    const separatorEl = inspectorContainerEl.querySelector('.inspector-separator') as HTMLElement;
    const headerTextEl = headerEl.querySelector('.inspector-header-name') as HTMLElement;
    const headerIconEl = headerEl.querySelector('.inspector-header-icon') as HTMLImageElement;
    const headerHintEl = headerEl.querySelector('.inspector-header-hint') as HTMLElement;

    const {
        groups,
        inputs,
        headerText = '',
        headerIcon = '',
        headerIconBackground = '',
        headerHint = '',
        ...inspectorOptions
    } = model.getInspectorConfig();

    const isLabeledNode = model instanceof LabeledNode;

    inspectorContainerEl.classList.remove('inspector-closed');
    headerEl.classList.remove('hidden');
    // Hide the separator if the node is labeled (has a "general" group inside the inspector config as a first group)
    separatorEl.classList.toggle('hidden', !isLabeledNode);
    headerTextEl.textContent = headerText;
    headerIconEl.src = headerIcon;
    headerIconEl.style.backgroundColor = headerIconBackground;
    headerHintEl.textContent = headerHint;

    const inspector = ui.Inspector.create(inspectorEl, {
        ...inspectorOptions,
        stateKey: () => model.id.toString(),
        cell: diagramData,
        multiOpenGroups: false,
        // Non-labeled nodes have multiple groups that should be tracked
        storeGroupsState: !isLabeledNode,
        restoreGroupsState: !isLabeledNode,
        groups,
        inputs: {
            [model.getDataPath()]: inputs
        },
    });

    if (openGroupName) {
        inspector.closeGroups();
        inspector.openGroup(openGroupName);
    }
}

/**
 * Closes the inspector if it is open.
 */
export function closeInspector(app: App) {
    const { inspectorContainerEl } = app;
    inspectorContainerEl.classList.add('inspector-closed');

    const headerEl = inspectorContainerEl.querySelector('.inspector-header') as HTMLElement;
    headerEl.classList.add('hidden');

    const separatorEl = inspectorContainerEl.querySelector('.inspector-separator') as HTMLElement;
    separatorEl.classList.add('hidden');

    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content') as HTMLElement;
    inspectorEl.innerHTML = INSPECTOR_PLACEHOLDER_HTML;

    ui.Inspector.instance?.storeGroupsState();

    ui.Inspector.close();
}
