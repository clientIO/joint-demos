import Controller from '../controller';
import { eventBus, EventBusEvents } from '../event-bus';
import { labelEditorWrapperStyles } from '../shapes/shared-config';
import { prepareLinkReplacement, validateAndReplaceConnections } from '../utils';
import { type AppShape, type AppElement, type AppLink } from '../shapes/shapes-typing';
import { type dia, shapes, ui } from '@joint/plus';
import type HaloService from '../services/halo-service';
import type InspectorService from '../services/inspector-service';
import type LinkToolsService from '../services/link-tools-service';
import type FreeTransformService from '../services/free-transform-service';
import { onSwimlaneDrag, onSwimlaneDragEnd, onSwimlaneDragStart } from '../events/swimlanes';
import { onElementDrag, onElementDragEnd, onElementDragStart } from '../events/elements';
import type { LabelElementView } from '../shapes/shape-view';

type EditControllerArgs = {
    graph: dia.Graph;
    paper: dia.Paper;
    selection: ui.Selection
    inspectorService: InspectorService;
    haloService: HaloService;
    linkToolsService: LinkToolsService;
    freeTransformService: FreeTransformService;
    keyboard: ui.Keyboard;
}

export default class EditController extends Controller<EditControllerArgs> {

    labelEditor: HTMLDivElement | null = null;

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
            'element:pointerdown': (context, elementView: dia.ElementView, evt: dia.Event, x, y) => {
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
                    } else {
                        onSwimlaneDragStart(paper, elementView, evt, x, y);
                    }
                } else {
                    onElementDragStart(paper, elementView, evt, x, y);
                }
            },
            'element:pointermove': (context, elementView: dia.ElementView, evt: dia.Event, x, y) => {
                const { paper } = context;
                const { model } = elementView;

                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    if (elementView.eventData(evt)?.preventDrop) return;

                    onSwimlaneDrag(paper, elementView, evt, x, y);
                } else {
                    onElementDrag(paper, elementView, evt, 0, 0);
                }
            },
            'element:pointerup': (context, elementView, evt, x, y) => {
                const { paper } = context;
                const { model } = elementView;

                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    if (elementView.eventData(evt)?.preventDrop) return;

                    onSwimlaneDragEnd(paper, elementView, evt, x, y);
                } else {
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

    private removeLabelEditor() {
        if (!this.labelEditor) return;

        // Trigger blur event to save the text and remove the editor
        (this.labelEditor.firstChild! as HTMLDivElement).blur();
        this.labelEditor = null;
    }
}

// Paper event handlers

function onElementPointerDblClick(context: EditControllerArgs, elementView: dia.ElementView) {
    return prepareLabelEditor(context, elementView);
}

function onLinkContextMenu(context: EditControllerArgs, linkView: dia.LinkView, evt: dia.Event) {

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

function onLinkConnect(context: EditControllerArgs, linkView: dia.LinkView) {
    const { graph, selection } = context;
    const batchName = 'link-replace';

    graph.startBatch(batchName);

    const replacementLink = prepareLinkReplacement(linkView.model as AppLink);
    graph.syncCells([replacementLink], { async: false });

    graph.stopBatch(batchName);
    selection.collection.reset([replacementLink]);
}

// Event bus event handlers

function onReplaceShape(context: EditControllerArgs, oldShape: AppShape, newShape: AppShape) {
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

function onSelectionChange(context: EditControllerArgs) {
    const { selection, paper, haloService, inspectorService, freeTransformService } = context;
    const { collection } = selection;

    haloService.close();
    freeTransformService.close(paper);
    inspectorService.close();

    if (collection.length === 1) {
        const primaryCell: joint.dia.Cell = collection.first();
        const primaryCellView = paper.findViewByModel(primaryCell);
        selectPrimaryCell(context, primaryCellView);
    }
}

// Helpers

function selectPrimaryCell(context: EditControllerArgs, cellView: joint.dia.CellView, showTools = true) {
    const { haloService, linkToolsService } = context;

    haloService.close();
    linkToolsService.remove();
    const cell = cellView.model;
    if (cell.isElement()) {
        selectPrimaryElement(context, <joint.dia.ElementView>cellView);
    } else {
        selectPrimaryLink(context, <joint.dia.LinkView>cellView, showTools);
    }
}

function selectPrimaryElement(context: EditControllerArgs, elementView: joint.dia.ElementView) {
    const { haloService, inspectorService, freeTransformService } = context;

    const element = elementView.model as AppElement;

    haloService.create(elementView);
    inspectorService.create(element);

    if (!element.isResizable) return;

    freeTransformService.create(elementView as dia.ElementView<AppElement>);
}

function selectPrimaryLink(context: EditControllerArgs, linkView: joint.dia.LinkView, showTools = true) {
    const { inspectorService, linkToolsService } = context;

    if (showTools) {
        linkToolsService.create(linkView);
    }
    inspectorService.create(linkView.model as AppLink);
}

function prepareLabelEditor(context: EditControllerArgs, cellView: dia.CellView) {

    const { paper, selection } = context;
    const cell = cellView.model as AppShape;

    if (!cell.getLabelEditorStyles) return null;

    const editableWrapper = document.createElement('div');
    editableWrapper.classList.add('label-editor-wrapper');

    const wrapperStyles = { ...labelEditorWrapperStyles, ...cell.getLabelEditorStyles(paper) };

    // Apply global wrapper styles and styles from the shape
    for (const [key, value] of Object.entries(wrapperStyles)) {
        (editableWrapper.style as any)[key] = value;
    }

    const contentEditableDiv = document.createElement('div');
    contentEditableDiv.contentEditable = 'true';
    contentEditableDiv.classList.add('label-editor');

    editableWrapper.appendChild(contentEditableDiv);

    // Clear the selection and select the cell to keep the inspector open
    selection.collection.reset([]);
    selectPrimaryCell(context, cellView, false);

    if (cell.isLink()) {
        editLinkLabel(editableWrapper, contentEditableDiv, cell as unknown as AppLink, paper);
    } else {
        editElementLabel(editableWrapper, contentEditableDiv, cell as unknown as AppElement, paper);
    }

    // Select all text in the editable area
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(contentEditableDiv, contentEditableDiv.childNodes.length);
    range.selectNodeContents(contentEditableDiv);
    sel?.removeAllRanges();
    sel?.addRange(range);

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

function editLinkLabel(editorWrapper: HTMLDivElement, editable: HTMLDivElement, link: AppLink, paper: dia.Paper) {

    const label = link.label(0)?.attrs?.label?.text;
    editable.innerText = label ?? '';

    // Hide the labels, so the label editor is visible instead
    const labelsNode = paper.findViewByModel(link)?.el.querySelector('.labels') as SVGElement | null;
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

        } else {
            link.removeLabel(0);
        }

        // Show the labels
        if (labelsNode) {
            labelsNode.style.display = 'block';
        }

        editorWrapper.remove();
    });
}

function editElementLabel(editorWrapper: HTMLDivElement, editable: HTMLDivElement, element: AppElement, paper: dia.Paper) {

    const labelPath = element.labelPath;

    // Store the original label
    const originalLabel = element.attr(labelPath) || '';
    editable.innerText = originalLabel;

    const labelElementView = paper.findViewByModel(element) as LabelElementView;
    labelElementView.setLabelNodeDisplay(false);

    paper.el.appendChild(editorWrapper);
    editable.focus();

    editable.addEventListener('blur', () => {

        element.attr(labelPath, editable.innerText.trim());
        labelElementView.setLabelNodeDisplay(true);

        editorWrapper.remove();
    });
}
