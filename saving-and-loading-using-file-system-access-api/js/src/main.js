import { dia, ui, shapes, linkTools, util } from '@joint/plus';
import './styles.css';

const colors = {
    blue: '#0075f2',
    red: '#ed2637',
    white: '#dde6e9',
    black: '#131e29',
    gray: '#cad8e3'
};

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 1,
    drawGrid: { name: 'mesh' },
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: colors.white },
    defaultAnchor: { name: 'center' },
    defaultConnectionPoint: {
        name: 'boundary'
    },
    defaultLink: () => new shapes.standard.Link()
});

document.getElementById('paper-container').appendChild(paper.el);

let currentLinkToolsView;

paper.on('link:pointerdown', (linkView) => {
    ui.Halo.clear(paper);
    if (linkView.hasTools()) return;

    const toolsView = new dia.ToolsView({
        name: 'link-hover',
        tools: [
            new linkTools.Vertices({ vertexAdding: true }),
            new linkTools.SourceAnchor(),
            new linkTools.TargetAnchor(),
            new linkTools.Remove()
        ]
    });

    linkView.addTools(toolsView);
    currentLinkToolsView = linkView;
});

paper.on('cell:pointerdown', (linkView) => {
    if (currentLinkToolsView) {
        currentLinkToolsView.removeTools();
        currentLinkToolsView = null;
    }
});

paper.on('blank:pointerdown', (linkView) => {
    if (currentLinkToolsView) {
        currentLinkToolsView.removeTools();
        currentLinkToolsView = null;
    }
});

paper.on('cell:pointerup', function (cellView) {
    // We don't want a Halo for links.
    if (cellView.model instanceof dia.Link) return;

    const halo = new ui.Halo({
        cellView: cellView,
        boxContent: false
    });
    halo.removeHandle('clone');
    halo.removeHandle('fork');
    halo.removeHandle('resize');
    halo.removeHandle('rotate');

    halo.render();
});

// Default graph declaration
graph.fromJSON({
    cells: [
        {
            id: 'r3',
            type: 'standard.Rectangle',
            position: { x: 120, y: 110 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    rx: 20,
                    ry: 20,
                    stroke: colors.red,
                    fill: colors.white
                },
                label: {
                    text: 'Start'
                }
            }
        },
        {
            id: 'p2',
            type: 'standard.Path',
            position: { x: 120, y: 210 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    d: 'M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z',
                    stroke: colors.red,
                    fill: colors.white
                },
                label: {
                    text: 'Input'
                }
            }
        },
        {
            id: 'p1',
            type: 'standard.Path',
            position: { x: 120, y: 310 },
            size: { width: 100, height: 100 },
            attrs: {
                body: {
                    d:
                        'M 0 calc(0.5 * h) calc(0.5 * w) 0 calc(w) calc(0.5 * h) calc(0.5 * w) calc(h) Z',
                    stroke: colors.red,
                    fill: colors.white
                },
                label: {
                    text: 'Decision'
                }
            }
        },
        {
            id: 'r4',
            type: 'standard.Rectangle',
            position: { x: 280, y: 450 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    stroke: colors.red,
                    fill: colors.white
                },
                label: {
                    text: 'Process'
                }
            }
        },
        {
            id: 'e1',
            type: 'standard.Ellipse',
            position: { x: 420, y: 450 },
            size: { width: 60, height: 60 },
            attrs: {
                body: {
                    stroke: colors.red,
                    fill: colors.white
                },
                label: {
                    text: 'End'
                }
            }
        },
        {
            id: 'l1',
            type: 'standard.Link',
            source: { id: 'r3' },
            target: { id: 'p2' }
        },
        {
            id: 'l2',
            type: 'standard.Link',
            source: { id: 'p2' },
            target: { id: 'p1' }
        },
        {
            id: 'l3',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'r4' },
            vertices: [
                { x: 170, y: 480 },
            ],
            labels: [{
                attrs: {
                    text: { text: 'Yes' },
                    rect: {
                        fill: colors.white
                    }
                }
            }]
        },
        {
            id: 'l4',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'p2' },
            vertices: [
                { x: 260, y: 360 },
                { x: 260, y: 240 }
            ],
            labels: [{
                attrs: {
                    text: {
                        text: 'No'
                    },
                    rect: {
                        fill: colors.white
                    }
                }
            }]
        },
        {
            id: 'l5',
            type: 'standard.Link',
            source: { id: 'r4' },
            target: { id: 'e1' }
        }
    ]
});

// Stencil settings
const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 150,
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: colors.gray
            }
        };
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 150,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

// Stencil elements declaration
stencil.load([
    {
        type: 'standard.Rectangle',
        size: { width: 100, height: 60 },
        attrs: {
            body: {
                rx: 20,
                ry: 20,
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                text: 'Start'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 100, height: 60 },
        attrs: {
            body: {
                d: 'M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z',
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                text: 'Input'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 100, height: 100 },
        attrs: {
            body: {
                d:
                    'M 0 calc(0.5 * h) calc(0.5 * w) 0 calc(w) calc(0.5 * h) calc(0.5 * w) calc(h) Z',
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                text: 'Decision'
            }
        }
    },
    {
        type: 'standard.Rectangle',
        size: { width: 100, height: 60 },
        attrs: {
            body: {
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                text: 'Process'
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 60, height: 60 },
        attrs: {
            body: {
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                text: 'End'
            }
        }
    },
]);

// Command Manager settings
const commandManager = new dia.CommandManager({ graph: graph });

// Here we assign id to every stack element in the command manager.
commandManager.on('stack:push', (cmd) => {
    const cmdId = util.uuid();
    cmd.forEach((c) => c.id = cmdId);
});

// The function which gets the id of the last command in the undo stack.
function getLastCmdId(commandManager) {
    let lastCmd = commandManager.undoStack[commandManager.undoStack.length - 1];
    if (!lastCmd) return null;
    if (!Array.isArray(lastCmd)) {
        return lastCmd.id;
    }
    return lastCmd[0].id;
}

// The function which checks if the current state is the saved state
function isSaved(commandManager, id) {
    const currentId = getLastCmdId(commandManager);
    return currentId === id;
}

// Here we update file name when there is an update to the command manager stack.
// We add '*' to the end of the name which shows that file was changed from previous save.
commandManager.on('stack', (opt) => {
    if (currentFileHandle) {
        if (!isSaved(commandManager, currentCmdId)) {
            document.getElementById('current-file-name').textContent = currentFileName + '*';
        } else {
            document.getElementById('current-file-name').textContent = currentFileName;
        }
    }
});

// Toolbar settings
const toolbar = new ui.Toolbar({
    theme: 'modern',
    autoToggle: true,
    references: {
        commandManager: commandManager
    },
    tools: [
        {
            type: 'button',
            text: 'New',
            name: 'new'
        },
        {
            type: 'button',
            text: 'Open',
            name: 'open'
        },
        {
            type: 'button',
            text: 'Save',
            name: 'save'
        },
        {
            type: 'button',
            text: 'Save as',
            name: 'saveas'
        },
        {
            type: 'undo',
            name: 'undo'
        },
        {
            type: 'redo',
            name: 'redo'
        }
    ]
});
document.getElementById('toolbar-container').appendChild(toolbar.render().el);

let currentFileHandle;
// Default file name
let currentFileName = 'Untitled.joint';
document.getElementById('current-file-name').textContent = currentFileName + '*';

let currentCmdId = null;

// The function which saves current diagram to a new file
const saveAsRoutine = async () => {
    // Get a file handler from the user
    currentFileHandle = await window.showSaveFilePicker({
        // The setting that shows that we accept only '.joint' files
        excludeAcceptAllOption: true,
        suggestedName: currentFileName,
        // Assign our custom file extension and its description
        types: [{
            description: 'JointJS diagram file',
            accept: {
                'application/json': ['.joint']
            }
        }]
    });
    currentFileName = currentFileHandle.name;

    // Convert current graph into byte array
    const str = JSON.stringify(graph.toJSON());
    const bytes = new TextEncoder().encode(str);

    // Create a FileSystemWritableFileStream to write to.
    const accessHandle = await currentFileHandle.createWritable();
    // Write existing graph
    accessHandle.write(bytes);
    accessHandle.close();

    // Reset command manager after opening a new file
    commandManager.reset();
    currentCmdId = null;
    document.getElementById('current-file-name').textContent = currentFileName;
}

// Create and open a new file handler
toolbar.on('new:pointerclick', async () => {
    // Get a file handler from the user
    currentFileHandle = await window.showSaveFilePicker({
        // The setting that shows that we accept only '.joint' files
        excludeAcceptAllOption: true,
        suggestedName: 'diagram.joint',
        // Assign our custom file extension and its description
        types: [{
            description: 'JointJS diagram file',
            accept: {
                'application/json': ['.joint']
            }
        }]
    });
    currentFileName = currentFileHandle.name;

    // Clear graph for a new file
    graph.clear()
    const str = JSON.stringify(graph.toJSON());
    const bytes = new TextEncoder().encode(str);

    // Create a FileSystemWritableFileStream to write to.
    const accessHandle = await currentFileHandle.createWritable();
    accessHandle.write(bytes);
    accessHandle.close();

    // Reset command manager after opening a new file
    commandManager.reset();
    currentCmdId = null;
    document.getElementById('current-file-name').textContent = currentFileName;
});

// Save a file handler
toolbar.on('save:pointerclick', async () => {
    // If there is a current file we save the graph to it
    if (currentFileHandle) {
        // Convert current graph into byte array
        const str = JSON.stringify(graph.toJSON());
        const bytes = new TextEncoder().encode(str);
        // Create a FileSystemWritableFileStream to write to.
        const accessHandle = await currentFileHandle.createWritable();
        // Write existing graph to the file
        accessHandle.write(bytes);
        accessHandle.close();
        currentCmdId = getLastCmdId(commandManager);
        // Update the file name to reflect that we just saved the file
        // By removing '*' mark
        document.getElementById('current-file-name').textContent = currentFileName;
        // Else we save the graph to a new file
    } else {
        saveAsRoutine();
    }
});

// Open a file handler
toolbar.on('open:pointerclick', async () => {
    // Get a file handler from the user
    [currentFileHandle] = await window.showOpenFilePicker({
        // The setting that shows that we accept only '.joint' files
        excludeAcceptAllOption: true,
        // Assign our custom file extension and its description
        types: [{
            description: 'JointJS diagram file',
            accept: {
                'application/json': ['.joint']
            }
        }]
    });
    currentFileName = currentFileHandle.name;

    // We get the file via the standard FileReader API
    const file = await currentFileHandle.getFile();
    const fileReader = new FileReader();
    fileReader.addEventListener('load', () => {
        // Load the data into the graph
        graph.fromJSON(JSON.parse(fileReader.result));
        commandManager.reset();
        currentCmdId = null;
        document.getElementById('current-file-name').textContent = currentFileName;
    });
    fileReader.readAsText(file);
});

// Save to a new file handler
toolbar.on('saveas:pointerclick', async () => {
    saveAsRoutine();
});

// Dialog settings
function showRestrictedDialog(options = {}) {
    const dialog = new ui.Dialog({
        theme: 'default',
        title: 'Example is restricted',
        width: 300,
        content: `<div>
    This example is not working properly in a <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox">sandboxed iframe</a> or in an <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts">insecure context</a>.
    </div>
    <br>
    <div>
    Try opening the example in secure context using this <a target="_blank" href="https://cdpn.io/pen/debug/vYrbvqm/b40444731849723a118554c9884350b3">link</a>.
    </div>`,
        buttons: [
            { action: 'ok', content: 'Ok', position: 'center' },
        ]
    });

    dialog.open();
    dialog.on({
        'action:ok': function () {
            dialog.remove();
        },
    });
}

function showBrowserSupportDialog(options = {}) {
    const dialog = new ui.Dialog({
        theme: 'default',
        title: 'Example is restricted',
        width: 320,
        content: `<div>
    This example works only in Chromium-base browsers. Mozilla did not implement <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API">File System Access API</a> due to security reasons.
    </div>
    <div>
    You can find more information <a target="_blank" href="https://mozilla.github.io/standards-positions/#native-file-system">here</a>.
    </div>`,
        buttons: [
            { action: 'ok', content: 'Ok', position: 'center' },
        ]
    });

    dialog.open();
    dialog.on({
        'action:ok': function () {
            dialog.remove();
        },
    });
}

if (window.showOpenFilePicker == null) {
    showBrowserSupportDialog();
} else {
    if (!window.isSecureContext || (window.parent !== window && window.frameElement == null)) {
        showRestrictedDialog();
    }
}

