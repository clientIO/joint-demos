import { ui } from '@joint/plus';

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
export function openInspector(app, model) {
    const { diagramData, inspectorContainerEl } = app;
    
    closeInspector(app);
    
    /**
     * @todo Could be moved to a custom Inspector view class.
     */
    inspectorContainerEl.classList.remove('inspector-closed');
    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content');
    const headerEl = inspectorContainerEl.querySelector('.inspector-header');
    const headerTextEl = headerEl.querySelector('.inspector-header-text');
    const headerIconEl = headerEl.querySelector('.inspector-header-icon');
    
    const { groups, inputs, headerText = '', headerIcon = '', ...inspectorOptions } = model.getInspectorConfig();
    
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
export function closeInspector(app) {
    const { inspectorContainerEl } = app;
    inspectorContainerEl.classList.add('inspector-closed');
    
    const headerEl = inspectorContainerEl.querySelector('.inspector-header');
    headerEl.classList.add('hidden');
    
    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content');
    inspectorEl.innerHTML = INSPECTOR_PLACEHOLDER_HTML;
    
    ui.Inspector.close();
}
