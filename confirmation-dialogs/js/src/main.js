import { dia, ui, shapes, linkTools, elementTools, V } from '@joint/plus';
import './styles.scss';

// Asset imports
import trashSvg from '../assets/icons/trash.svg';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    drawGrid: { name: 'mesh' },
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' }
});

document.getElementById('paper-container').appendChild(paper.el);

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
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

stencil.load([
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'I.\nui.Dialog'
            }
        }
    },
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'II.\nNative\nconfirm()'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 80, height: 60 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                y: 40,
                fill: '#fff',
                text: 'III.\nui.Dialog'
            },
            body: {
                fill: '#333',
                d: 'M calc(.5*w) 0 calc(w) calc(h) 0 calc(h) Z'
            }
        }
    }
]);

graph.addCells([
    {
        id: 'el1',
        type: 'standard.Rectangle',
        position: { x: 50, y: 100 },
        size: { width: 100, height: 100 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'ui.Halo'
            }
        }
    },
    {
        id: 'el2',
        type: 'standard.Rectangle',
        position: { x: 400, y: 100 },
        size: { width: 100, height: 100 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Element'
            }
        }
    },
    {
        id: 'l1',
        type: 'standard.Link',
        source: { id: 'el1' },
        target: { id: 'el2' },
        labels: [
            {
                attrs: {
                    text: {
                        fontFamily: 'sans-serif',
                        text: 'linkTools.Remove'
                    }
                }
            }
        ]
    }
]);

const history = new dia.CommandManager({
    graph
});

const toolbar = new ui.Toolbar({
    autoToggle: true,
    tools: ['undo', 'redo'],
    references: {
        commandManager: history
    }
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

// ui.Halo
// =======

const el1 = graph.getCell('el1');
const halo = new ui.Halo({
    cellView: el1.findView(paper),
    useModelGeometry: true,
    clearOnBlankPointerdown: false,
    handles: [
        {
            name: 'remove',
            position: 'nw',
            icon: trashSvg,
            events: {
                pointerdown: () => confirmRemoval(el1)
            }
        }
    ]
});
halo.render();

function confirmRemoval(cell) {
    showDialog({
        text: 'Are you sure you want to remove this element?',
        yesText: 'Remove',
        yes: () => cell.remove(),
        noText: 'Cancel'
    });
}

// ElementTools.Remove
// ===================

const el2 = graph.getCell('el2');
const elToolsView = new dia.ToolsView({
    tools: [
        new elementTools.Remove({
            x: '100%',
            y: 0,
            offset: { x: 10, y: -10 },
            action: () => confirmRemoval(el2)
        })
    ]
});
el2.findView(paper).addTools(elToolsView);

// LinkTools.Remove
// ================

const l1 = graph.getCell('l1');
const linkToolsView = new dia.ToolsView({
    tools: [
        new linkTools.Remove({
            offset: 0,
            distance: 30,
            action: () => confirmRemoval(l1)
        })
    ]
});
l1.findView(paper).addTools(linkToolsView);

// Element Stencil Drop
// ====================

// 1. Undo the last action after the drop was done
stencil.on('element:drop', (elementView) => {
    const element = elementView.model;
    if (element.get('type') !== 'standard.Ellipse') return;
    // The element is already in the graph (graph `add` event was triggered)
    // The cancel action will undo the last command in history
    confirmLastAction(history);
});

function confirmLastAction(history) {
    showDialog({
        text: 'Are you sure you want to keep the last action?',
        yesText: 'Keep',
        noText: 'Cancel',
        no: () => history.cancel()
    });
}

// 2. Block the UI before the drop and do not add the element
// to the graph unless the user confirms
stencil.on('element:dragend', (cloneView) => {
    const clone = cloneView.model;
    if (clone.get('type') !== 'standard.Rectangle') return;
    // Using the native confirm() function (blocks the UI)
    if (!confirm('Are you sure you want to add this element?')) {
        stencil.cancelDrag({ dropAnimation: true });
    }
});

// 3. Do not block the UI with the native confirm dialog, but
// make sure the graph stays untouched if not confirmed
// Display an animated placehoder while we are waiting for the user
// to confirm the action.
stencil.on(
    'element:dragend',
    async(
        dragView,
        _evt,
        bbox,
        isValidDropArea
    ) => {
        const dragModel = dragView.model;
        if (dragModel.get('type') !== 'standard.Path') return;
        // Cancel the original drop without the animation
        stencil.cancelDrag({ dropAnimation: false });
        // And put a placeholder SVGElement on the very same location
        const placeholderVEl = V('path')
            .attr('d', V.rectToPath(bbox))
            .addClass('placeholder'); // see CSS tab for the styles
        placeholderVEl.appendTo(paper.viewport);
        if (!isValidDropArea) return;
        // Add the element to the graph manually upon confirmation
        const element = dragModel.clone();
        element.position(bbox.x, bbox.y);
        element.size(bbox.width, bbox.height);
        await confirmAddition(graph, element);
        // Remove the placeholder SVGElement after the user closes the dialog
        placeholderVEl.remove();
    }
);

function confirmAddition(graph, element) {
    return new Promise((resolve) => {
        showDialog({
            text: 'Are you sure you want to add this element?',
            yesText: 'Add',
            yes: () => {
                graph.addCell(element);
                resolve();
            },
            no: () => {
                resolve();
            },
            noText: 'Cancel'
        });
    });
}

// Dialog (general yes/no dialog)
// ==============================

function showDialog(options = {}) {
    const {
        text = 'Are you sure?',
        noText = 'No',
        yesText = 'Yes',
        no = () => { },
        yes = () => { }
    } = options;
    const dialog = new ui.Dialog({
        theme: 'modern',
        title: 'Confirmation',
        width: 300,
        content: text,
        buttons: [
            { action: 'no', content: noText },
            {
                action: 'yes',
                content: `<span style="color:#fe854f">${yesText}</span>`
            }
        ]
    });

    dialog.open();
    dialog.on({
        'action:no action:close': function() {
            no();
            dialog.remove();
        },
        'action:yes': function() {
            yes();
            dialog.remove();
        }
    });
}
