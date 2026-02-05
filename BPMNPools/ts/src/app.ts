/* Bootstrap the application. */

import { dia, ui, shapes as defaultShapes } from '@joint/plus';
import {
    HorizontalPool,
    HorizontalPoolView,
    VerticalPool,
    VerticalPoolView,
    HorizontalSwimlane,
    HorizontalSwimlaneView,
    VerticalSwimlane,
    VerticalSwimlaneView,
    HorizontalPhase,
    HorizontalPhaseView,
    VerticalPhase,
    VerticalPhaseView,
    Event,
    Activity,
    Gateway
} from './shapes';
import { editElementLabel } from './actions/text';
import { select, deselect, removeSelection } from './actions/selection';
import { addLinkTools, removeLinkTools } from './tools';
import { addBPMNListeners } from './events';
import { loadExample } from './example';
import { setupXMLImport } from './actions/import';
import { downloadXMLExport } from './actions/export';

const shapes = {
    ...defaultShapes,
    custom: {
        HorizontalPool,
        HorizontalPoolView,
        VerticalPool,
        VerticalPoolView,
        HorizontalSwimlane,
        HorizontalSwimlaneView,
        VerticalSwimlane,
        VerticalSwimlaneView,
        HorizontalPhase,
        HorizontalPhaseView,
        VerticalPhase,
        VerticalPhaseView,
        Event,
        Activity,
        Gateway
    }
};

export const init = () => {

    const graph = new dia.Graph({}, { cellNamespace: shapes });
    loadExample(graph);

    // DEBUG
    // window.graph = graph;

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: shapes,
        width: '100%',
        height: '100%',
        gridSize: 10,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#F3F7F6' },
        embeddingMode: true,
        clickThreshold: 10,
        findParentBy: 'center',
        frontParentOnly: false,
        preventDefaultBlankAction: false,
        preventDefaultViewAction: false,
        linkPinning: false,
        frozen: true,
        defaultRouter: {
            name: 'manhattan',
            args: {
                excludeTypes: [
                    'custom.HorizontalPool',
                    'custom.VerticalPool',
                    'custom.HorizontalSwimlane',
                    'custom.VerticalSwimlane',
                    'custom.HorizontalPhase',
                    'custom.VerticalPhase'
                ],
                padding: 10,
            }
        },
        defaultLink: () => new shapes.bpmn2.Flow(),
        validateConnection: (cellViewS, _magnetS, cellViewT, _magnetT, _end, _linkView) => {
            // Connecting to self is not allowed.
            if (cellViewS === cellViewT) return false;
            const source = cellViewS.model;
            const target  = cellViewT.model;
            // Connecting to/from a Swimlane is not allowed.
            if (shapes.bpmn2.Swimlane.isSwimlane(source) || shapes.bpmn2.Swimlane.isSwimlane(target)) return false;
            if (shapes.bpmn2.CompositePool.isPool(source) || shapes.bpmn2.CompositePool.isPool(target)) {
                // Connecting two CompositePools is allowed.
                if (shapes.bpmn2.CompositePool.isPool(source) && shapes.bpmn2.CompositePool.isPool(target)) return true;
                // Connecting to/from a CompositePool is not allowed.
                else return false;
            }
            return true;
        },
        interactive: (cellView) => {
            const cell = cellView.model;
            // Not in use currently. The default interaction is prevented in BPMNController for Swimlanes.
            if (shapes.bpmn2.Swimlane.isSwimlane(cell)) return { stopDelegation: false };
            if (shapes.bpmn2.Phase.isPhase(cell)) return { stopDelegation: false };
            return true;
        },
        validateEmbedding: (childView, parentView) => {
            const child = childView.model;
            const parent = parentView.model;
            // CompositePools and Swimlanes cannot be embedded the native way.
            if (shapes.bpmn2.CompositePool.isPool(child)) return false;
            if (shapes.bpmn2.Swimlane.isSwimlane(child)) return false;
            if (shapes.bpmn2.Phase.isPhase(child)) {
                //if (shapes.bpmn2.CompositePool.isPool(parent)) return true;
                return false;
            }
            // Elements can be embedded into Swimlanes only.
            if (!shapes.bpmn2.Swimlane.isSwimlane(parent)) return false;
            return true;
        },
        validateUnembedding: function(childView) {
            const child = childView.model;
            if (shapes.bpmn2.CompositePool.isPool(child)) return true;
            if (shapes.bpmn2.Swimlane.isSwimlane(child)) return true;
            if (shapes.bpmn2.Phase.isPhase(child)) return true;
            return false;
        },
        highlighting: {
            embedding: {
                name: 'addClass',
                options: {
                    className: 'hgl-container'
                }
            },
            connecting: {
                name: 'addClass',
                options: {
                    className: 'hgl-target'
                }
            },
        }
    });

    const paperContainerEl = document.getElementById('paper-container');
    paperContainerEl.appendChild(paper.el);
    paper.unfreeze();

    const stencil = new ui.Stencil({
        paper,
        usePaperGrid: true,
        width: 100,
        height: '100%',
        paperOptions: () => {
            return {
                model: new dia.Graph({}, { cellNamespace: shapes }),
                cellViewNamespace: shapes,
                background: {
                    color: '#FCFCFC'
                }
            };
        },
        layout: {
            columns: 1,
            rowHeight: 'compact',
            rowGap: 10,
            columnWidth: 100,
            marginY: 10,
            // reset defaults
            resizeToFit: false,
            dx: 0,
            dy: 0
        },
    });

    document.getElementById('stencil-container').appendChild(stencil.el);
    stencil.render();
    stencil.load([
        {
            type: 'custom.HorizontalPool',
        }, {
            type: 'custom.VerticalPool',
            size: { width: 60, height: 80 },
        }, {
            type: 'custom.VerticalSwimlane',
            size: { width: 80, height: 30 },
        }, {
            type: 'custom.VerticalPhase',
            size: { width: 80, height: 30 },
        }, {
            type: 'custom.Event'
        }, {
            type: 'custom.Event',
            attrs: {
                border: {
                    borderType: 'double'
                }
            }
        }, {
            type: 'custom.Event',
            attrs: {
                border: {
                    borderType: 'thick'
                }
            }
        }, {
            type: 'custom.Activity',
            size: { width: 80, height: 60 }
        }, {
            type: 'custom.Gateway',
            size: { width: 60, height: 60 }
        }
    ]);

    const keyboard = new ui.Keyboard();

    // Events

    addBPMNListeners({ paper, stencil });

    // Selection

    paper.on({
        'element:pointerclick': (elementView, _evt) => {
            select(elementView);
        },
        'blank:pointerclick': (_evt) => {
            deselect(paper);
        },
        'link:mouseenter': (linkView, evt) => {
            // Do not show link tools when the user is dragging something.
            if (evt.buttons !== 0) return;
            addLinkTools(linkView);
        },
        'link:mouseleave': (linkView, _evt) => {
            removeLinkTools(linkView);
        },
    });

    keyboard.on('delete backspace', () => {
        removeSelection(graph);
    });

    // Text Editing

    paper.on('element:pointerdblclick', (elementView, evt) => {
        const element = elementView.model;
        if (shapes.bpmn2.CompositePool.isPool(element) || shapes.bpmn2.Swimlane.isSwimlane(element) || shapes.bpmn2.Phase.isPhase(element)) {
            // Only the header can be edited.
            const { target } = evt;
            if ((target.tagName !== 'tspan') && (target.getAttribute('joint-selector') !== 'header')) return;
        }
        editElementLabel(elementView);
    });

    // Undo / Redo

    const history = new dia.CommandManager({ graph });

    const toolbar = new ui.Toolbar({
        autoToggle: true,
        references: {
            commandManager: history
        },
        tools: [{
            type: 'button',
            name: 'clear',
            text: '╳ Clear',
        }, {
            type: 'undo',
            text: '↩',
        }, {
            type: 'redo',
            text: '↪',
        }, {
            type: 'button',
            name: 'export',
            text: 'Export',
        }]
    });

    toolbar.render();
    document.getElementById('toolbar-container').appendChild(toolbar.el);

    toolbar.on('clear:pointerclick', () => {
        graph.resetCells([]);
        history.reset();
    });

    toolbar.on('export:pointerclick', () => {
        downloadXMLExport(paper);
    });

    // Setup drag and drop for XML import
    setupXMLImport(graph, paperContainerEl);

    return function destroy() {
        paper.remove();
        stencil.remove();
        keyboard.disable();
        toolbar.remove();
    };
};
