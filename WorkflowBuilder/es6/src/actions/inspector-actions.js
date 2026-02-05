var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
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
    const inspectorEl = inspectorContainerEl.querySelector('.inspector-content');
    const headerEl = inspectorContainerEl.querySelector('.inspector-header');
    const separatorEl = inspectorContainerEl.querySelector('.inspector-separator');
    const headerTextEl = headerEl.querySelector('.inspector-header-name');
    const headerIconEl = headerEl.querySelector('.inspector-header-icon');
    const headerHintEl = headerEl.querySelector('.inspector-header-hint');
    
    const _a = model.getInspectorConfig(), { groups, inputs, headerText = '', headerIcon = '', headerHint = '' } = _a, inspectorOptions = __rest(_a, ["groups", "inputs", "headerText", "headerIcon", "headerHint"]);
    
    inspectorContainerEl.classList.remove('inspector-closed');
    headerEl.classList.remove('hidden');
    separatorEl.classList.remove('hidden');
    headerTextEl.textContent = headerText;
    headerHintEl.textContent = headerHint;
    headerIconEl.src = headerIcon;
    
    ui.Inspector.create(inspectorEl, Object.assign(Object.assign({}, inspectorOptions), { cell: diagramData, groups, inputs: {
            [model.getDataPath()]: inputs
        } }));
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
    
    ui.Inspector.close();
}
