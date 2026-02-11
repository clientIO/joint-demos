import Controller from '../controller';
import { eventBus, EventBusEvents } from '../event-bus';
import { labelEditorWrapperStyles } from '../shapes/shared-config';
import { prepareLinkReplacement, validateAndReplaceConnections } from '../utils';
import { shapes, ui } from '@joint/plus';
import { onSwimlaneDrag, onSwimlaneDragEnd, onSwimlaneDragStart } from '../events/swimlanes';
import { onElementDrag, onElementDragEnd, onElementDragStart } from '../events/elements';

export default class EditController extends Controller {
    constructor() {
        super(...arguments);
        
        this.labelEditor = null;
    }
    
    startListening() {
        const { paper, selection } = this.context;
        
        this.listenTo(paper, {
            'element:pointerdblclick': (context, elementView) => {
                this.labelEditor = onElementPointerDblClick(context, elementView);
            },
            'link:contextmenu': (context, linkView, evt) => {
                const contextToolbar = onLinkContextMenu(context, linkView, evt);
                contextToolbar.once('action:edit-label', () => {
                    this.labelEditor = prepareLabelEditor(context, linkView);
                    ui.ContextToolbar.close();
                });
            },
            'cell:pointerdown': (_context, _cellView, _evt, _x, _y) => {
                this.removeLabelEditor();
            },
            'blank:pointerdown': (_context, _evt, _x, _y) => {
                this.removeLabelEditor();
            },
            'element:pointerdown': (context, elementView, evt, x, y) => {
                const { paper, keyboard } = context;
                const { model } = elementView;
                
                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    if (keyboard.isActive('shift', evt)) {
                        // Enable selecting inside the pool with `shift`
                        elementView.setInteractivity(false);
                        elementView.preventDefaultInteraction(evt);
                        elementView.eventData(evt, {
                            preventDrop: true
                        });
                    }
                    else {
                        onSwimlaneDragStart(paper, elementView, evt, x, y);
                    }
                }
                else {
                    onElementDragStart(paper, elementView, evt, x, y);
                }
            },
            'element:pointermove': (context, elementView, evt, x, y) => {
                var _a;
                const { paper } = context;
                const { model } = elementView;
                
                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    if ((_a = elementView.eventData(evt)) === null || _a === void 0 ? void 0 : _a.preventDrop)
                        return;
                    
                    onSwimlaneDrag(paper, elementView, evt, x, y);
                }
                else {
                    onElementDrag(paper, elementView, evt, 0, 0);
                }
            },
            'element:pointerup': (context, elementView, evt, x, y) => {
                var _a;
                const { paper } = context;
                const { model } = elementView;
                
                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    if ((_a = elementView.eventData(evt)) === null || _a === void 0 ? void 0 : _a.preventDrop)
                        return;
                    
                    onSwimlaneDragEnd(paper, elementView, evt, x, y);
                }
                else {
                    onElementDragEnd(paper, elementView, evt, x, y);
                }
            },
            'link:connect': onLinkConnect
        });
        
        this.listenTo(eventBus, {
            [EventBusEvents.GRAPH_REPLACE_CELL]: onReplaceShape
        });
        
        this.listenTo(selection.collection, {
            'reset add remove': onSelectionChange
        });
    }
    
    removeLabelEditor() {
        if (!this.labelEditor)
            return;
        
        // Trigger blur event to save the text and remove the editor
        this.labelEditor.firstChild.blur();
        this.labelEditor = null;
    }
}

// Paper event handlers

function onElementPointerDblClick(context, elementView) {
    return prepareLabelEditor(context, elementView);
}

function onLinkContextMenu(context, linkView, evt) {
    
    const contextToolbar = new ui.ContextToolbar({
        vertical: true,
        target: {
            x: evt.clientX,
            y: evt.clientY
        },
        root: context.paper.el,
        tools: [
            {
                action: 'edit-label',
                content: !linkView.model.hasLabels() ? 'Add Label' : 'Edit Label',
            }
        ]
    });
    contextToolbar.render();
    return contextToolbar;
}

function onLinkConnect(context, linkView) {
    const { graph, selection } = context;
    const batchName = 'link-replace';
    
    graph.startBatch(batchName);
    
    const replacementLink = prepareLinkReplacement(linkView.model);
    graph.syncCells([replacementLink], { async: false });
    
    graph.stopBatch(batchName);
    selection.collection.reset([replacementLink]);
}

// Event bus event handlers

function onReplaceShape(context, oldShape, newShape) {
    const { graph, selection } = context;
    const { collection } = selection;
    const batchName = 'replace-shape';
    
    graph.startBatch(batchName);
    
    newShape.copyFrom(oldShape);
    graph.syncCells([newShape]);
    
    if (oldShape.isElement()) {
        // Validate and replace connections when we are changing the element type
        // since the new element might have different connection rules
        validateAndReplaceConnections(newShape, graph);
    }
    
    graph.stopBatch(batchName);
    collection.reset([newShape]);
}

// Selection event handlers

function onSelectionChange(context) {
    const { selection, paper, haloService, inspectorService, freeTransformService } = context;
    const { collection } = selection;
    
    haloService.close();
    freeTransformService.close(paper);
    inspectorService.close();
    
    if (collection.length === 1) {
        const primaryCell = collection.first();
        const primaryCellView = paper.findViewByModel(primaryCell);
        selectPrimaryCell(context, primaryCellView);
    }
}

// Helpers

function selectPrimaryCell(context, cellView, showTools = true) {
    const { haloService, linkToolsService } = context;
    
    haloService.close();
    linkToolsService.remove();
    const cell = cellView.model;
    if (cell.isElement()) {
        selectPrimaryElement(context, cellView);
    }
    else {
        selectPrimaryLink(context, cellView, showTools);
    }
}

function selectPrimaryElement(context, elementView) {
    const { haloService, inspectorService, freeTransformService } = context;
    
    const element = elementView.model;
    
    haloService.create(elementView);
    inspectorService.create(element);
    
    if (!element.isResizable)
        return;
    
    freeTransformService.create(elementView);
}

function selectPrimaryLink(context, linkView, showTools = true) {
    const { inspectorService, linkToolsService } = context;
    
    if (showTools) {
        linkToolsService.create(linkView);
    }
    inspectorService.create(linkView.model);
}

function prepareLabelEditor(context, cellView) {
    
    const { paper, selection } = context;
    const cell = cellView.model;
    
    if (!cell.getLabelEditorStyles)
        return null;
    
    const editableWrapper = document.createElement('div');
    editableWrapper.classList.add('label-editor-wrapper');
    
    const wrapperStyles = Object.assign(Object.assign({}, labelEditorWrapperStyles), cell.getLabelEditorStyles(paper));
    
    // Apply global wrapper styles and styles from the shape
    for (const [key, value] of Object.entries(wrapperStyles)) {
        editableWrapper.style[key] = value;
    }
    
    const contentEditableDiv = document.createElement('div');
    contentEditableDiv.contentEditable = 'true';
    contentEditableDiv.classList.add('label-editor');
    
    editableWrapper.appendChild(contentEditableDiv);
    
    // Clear the selection and select the cell to keep the inspector open
    selection.collection.reset([]);
    selectPrimaryCell(context, cellView, false);
    
    if (cell.isLink()) {
        editLinkLabel(editableWrapper, contentEditableDiv, cell, paper);
    }
    else {
        editElementLabel(editableWrapper, contentEditableDiv, cell, paper);
    }
    
    // Select all text in the editable area
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(contentEditableDiv, contentEditableDiv.childNodes.length);
    range.selectNodeContents(contentEditableDiv);
    sel === null || sel === void 0 ? void 0 : sel.removeAllRanges();
    sel === null || sel === void 0 ? void 0 : sel.addRange(range);
    
    // Prevent default scroll behavior and manage centering
    contentEditableDiv.addEventListener('input', () => {
        // Reset the height to recalculate the scrollHeight
        contentEditableDiv.style.height = 'auto';
        
        // Calculate new height
        const newHeight = contentEditableDiv.clientHeight;
        
        // Ensure editable area also expands as needed
        contentEditableDiv.style.height = `${newHeight}px`;
    });
    
    // Enable text selection
    contentEditableDiv.addEventListener('mousedown', (evt) => {
        evt.stopPropagation();
    });
    
    // Enable saving on Enter (without shift), cancel on Escape
    contentEditableDiv.addEventListener('keydown', (evt) => {
        
        const isEnter = evt.key === 'Enter';
        
        if (evt.key === 'Escape' || (isEnter && !evt.shiftKey)) {
            if (isEnter) {
                evt.preventDefault();
            }
            contentEditableDiv.blur();
            selection.collection.reset([cell]);
        }
    });
    
    return editableWrapper;
}

function editLinkLabel(editorWrapper, editable, link, paper) {
    var _a, _b, _c, _d;
    
    const label = (_c = (_b = (_a = link.label(0)) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.label) === null || _c === void 0 ? void 0 : _c.text;
    editable.innerText = label !== null && label !== void 0 ? label : '';
    
    // Hide the labels, so the label editor is visible instead
    const labelsNode = (_d = paper.findViewByModel(link)) === null || _d === void 0 ? void 0 : _d.el.querySelector('.labels');
    if (labelsNode) {
        labelsNode.style.display = 'none';
    }
    
    paper.el.appendChild(editorWrapper);
    editable.focus();
    
    editable.addEventListener('blur', () => {
        
        // Remove line breaks
        const parsedText = editable.innerText.trim().replace(/<br>/, '');
        
        if (parsedText !== '') {
            
            link.label(0, {
                attrs: {
                    label: {
                        text: parsedText
                    }
                }
            });
            
        }
        else {
            link.removeLabel(0);
        }
        
        // Show the labels
        if (labelsNode) {
            labelsNode.style.display = 'block';
        }
        
        editorWrapper.remove();
    });
}

function editElementLabel(editorWrapper, editable, element, paper) {
    
    const labelPath = element.labelPath;
    
    // Store the original label
    const originalLabel = element.attr(labelPath) || '';
    editable.innerText = originalLabel;
    
    const labelElementView = paper.findViewByModel(element);
    labelElementView.setLabelNodeDisplay(false);
    
    paper.el.appendChild(editorWrapper);
    editable.focus();
    
    editable.addEventListener('blur', () => {
        
        element.attr(labelPath, editable.innerText.trim());
        labelElementView.setLabelNodeDisplay(true);
        
        editorWrapper.remove();
    });
}
