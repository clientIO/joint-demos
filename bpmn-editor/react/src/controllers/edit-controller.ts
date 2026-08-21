import Controller from '../controller';
import { eventBus, EventBusEvents } from '../event-bus';
import { labelEditorWrapperStyles } from '../shapes/shared-config';
import { prepareLinkReplacement, validateAndReplaceConnections } from '../utils';
import { type AppShape, type AppElement, type AppLink } from '../shapes/shapes-typing';
import { type dia, shapes, type ui } from '@joint/plus';
import { onSwimlaneDrag, onSwimlaneDragEnd, onSwimlaneDragStart } from '../events/swimlanes';
import { onElementDrag, onElementDragEnd, onElementDragStart } from '../events/elements';

import type { ContextMenuLike } from '../editor/context-menu-bridge';
import type LinkToolsService from '../services/link-tools-service';
import type FreeTransformService from '../services/free-transform-service';
import type { LabelElementView } from '../shapes/shape-view';

type EditControllerArgs = {
    graph: dia.Graph;
    paper: dia.Paper;
    selection: Pick<ui.Selection, 'collection'>
    contextMenu: ContextMenuLike;
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
            'link:contextmenu': (context, linkView: dia.LinkView, evt: dia.Event) => {
                const { paper, contextMenu } = context;
                const { x, y } = paper.clientToLocalPoint(evt.clientX!, evt.clientY!);

                contextMenu.open({
                    x,
                    y,
                    items: [
                        {
                            action: 'edit-label',
                            label: !linkView.model.hasLabels() ? 'Add Label' : 'Edit Label'
                        }
                    ],
                    onAction: (action) => {
                        contextMenu.close();
                        if (action === 'edit-label') {
                            this.labelEditor = prepareLabelEditor(context, linkView);
                        }
                    }
                });
            },
            'cell:pointerdown': (context, _cellView, _evt, _x, _y) => {
                context.contextMenu.close();
                this.removeLabelEditor();
            },
            'blank:pointerdown': (context, _evt, _x, _y) => {
                context.contextMenu.close();
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

// The halo and the inspector are React components deriving their state from
// the selection collection; only the imperative views (free transform, link
// tools) are managed here.
function onSelectionChange(context: EditControllerArgs) {
    const { selection, paper, freeTransformService, linkToolsService } = context;
    const { collection } = selection;

    freeTransformService.close(paper);
    linkToolsService.remove();

    if (collection.length !== 1) return;

    const primaryCell: dia.Cell = collection.first();
    const primaryCellView = paper.findViewByModel(primaryCell);

    if (primaryCell.isElement()) {
        const element = primaryCell as AppElement;
        if (element.isResizable) {
            freeTransformService.create(primaryCellView as dia.ElementView<AppElement>);
        }
    } else {
        linkToolsService.create(primaryCellView as dia.LinkView);
    }
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
        editableWrapper.style.setProperty(key, value as string);
    }

    const contentEditableDiv = document.createElement('div');
    contentEditableDiv.contentEditable = 'true';
    contentEditableDiv.classList.add('label-editor');

    editableWrapper.appendChild(contentEditableDiv);

    // Keep the cell selected so the inspector stays open during the edit.
    selection.collection.reset([cellView.model]);

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
