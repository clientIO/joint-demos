import { ui } from '@joint/plus';
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

/**
 * Opens the inspector for the given cell.
 * @param app - The application instance.
 * @param model - The model to open the inspector for.
 * @param options - The options object for the inspector.
 * @param options.openGroupName - The name of the group to open.
 */
export function openInspector(app, model, { openGroupName } = {}) {
    const { diagramData, inspectorContainerEl } = app;
    
    closeInspector(app);
    
    /**
     * @todo Could be moved to a custom Inspector view class.
     */
    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content');
    const headerEl = inspectorContainerEl.querySelector('.inspector-header');
    const separatorEl = inspectorContainerEl.querySelector('.inspector-separator');
    const headerTextEl = headerEl.querySelector('.inspector-header-name');
    const headerIconEl = headerEl.querySelector('.inspector-header-icon');
    const headerHintEl = headerEl.querySelector('.inspector-header-hint');
    
    const { groups, inputs, headerText = '', headerIcon = '', headerIconBackground = '', headerHint = '', ...inspectorOptions } = model.getInspectorConfig();
    
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
export function closeInspector(app) {
    const { inspectorContainerEl } = app;
    inspectorContainerEl.classList.add('inspector-closed');
    
    const headerEl = inspectorContainerEl.querySelector('.inspector-header');
    headerEl.classList.add('hidden');
    
    const separatorEl = inspectorContainerEl.querySelector('.inspector-separator');
    separatorEl.classList.add('hidden');
    
    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content');
    inspectorEl.innerHTML = INSPECTOR_PLACEHOLDER_HTML;
    
    ui.Inspector.instance?.storeGroupsState();
    
    ui.Inspector.close();
}
