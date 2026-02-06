import { dia, ui, shapes, linkTools, graphUtils } from '@joint/plus';
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
    efaultAnchor: { name: 'center' },
    defaultConnectionPoint: {
        name: 'boundary'
    },
    defaultLink: () => new shapes.standard.Link()
});

const paperContainer = document.getElementById('paper-container');
paperContainer.appendChild(paper.el);

// Selection settings

const selection = new ui.Selection({
    paper: paper,
    boxContent: false
});

paper.on('cell:pointerup', function(cellView) {
    // We don't want a Halo for links.
    if (cellView.model instanceof dia.Link) return;

    var halo = new ui.Halo({
        cellView: cellView,
        boxContent: false
    });
    halo.removeHandle('clone');
    halo.removeHandle('fork');
    halo.removeHandle('rotate');

    halo.render();
});

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

paper.on('blank:pointerdown', (evt) => {
    selection.startSelecting(evt);
    if (currentLinkToolsView) {
        currentLinkToolsView.removeTools();
        currentLinkToolsView = null;
    }
});

paper.on('element:pointerup', function(cellView, evt) {
    // Add element to selection if CTRL/Meta key is pressed while the element is clicked.
    if ((evt.ctrlKey || evt.metaKey)) {
        selection.collection.add(cellView.model);
    } else {
        // Create selection from clicked element
        selection.collection.reset([cellView.model]);
    }
});

selection.on('selection-box:pointerdown', function(cellView, evt) {
    // Unselect an element if the CTRL/Meta key is pressed while a selected element is clicked.
    if (evt.ctrlKey || evt.metaKey) {
        selection.collection.remove(cellView.model);
    }
});

selection.on('selection-box:pointerup', (elementView, evt) => {
    if (evt.button === 2) {
        evt.stopPropagation();
        renderContextToolbar({ x: evt.clientX, y: evt.clientY }, selection.collection.toArray());
    }
});

// Default clipboard plugin setup for purposes of the current demo
const clipboard = new ui.Clipboard({ useLocalStorage: false });

// Keyboard settings
const keyboard = new ui.Keyboard();

// Keep track of mouse position for paste keyboard interaction
let cx = 0;
let cy = 0;
paperContainer.addEventListener('mousemove', (evt) => {
    cx = evt.clientX;
    cy = evt.clientY;
});
paperContainer.addEventListener('mouseleave', (evt) => {
    cx = null;
    cy = null;
});

keyboard.on('ctrl+c command+c', async(evt) => {
    evt.preventDefault();

    // Get current selected cells
    const cells = selection.collection.toArray();
    if (cells.length) {
        await copyCells(cells);
    }
});

keyboard.on('ctrl+v command+v', async(evt) => {
    if (cx === null || cy === null) return;
    evt.preventDefault();

    // Get current point
    const point = paper.snapToGrid(cx, cy);
    await pasteFromClipboard(point);
});

// Function to copy cells to the ui.Clipboard plugin
const copyCells = async(cells) => {
    // Extract text data from cells
    // We are doing it here because cells in the ui.Clipboard don't have view

    // We find adjacency list from the graph
    const adjacencyList = graphUtils.toAdjacencyList(graph);
    const cellTextContents = {};
    const resultList = {};
    const connectedCells = {};
    cells.forEach(cell => {
        cellTextContents[cell.id] = paper.findViewByModel(cell).el.textContent;

        const nextNodes = adjacencyList[cell.id].filter(nextId => cells.some(c => c.id === nextId));
        if (nextNodes.length) {
            connectedCells[cell.id] = true;
            nextNodes.forEach(nodeId => connectedCells[nodeId] = true);
        }
        resultList[cell.id] = nextNodes;
    });
    let textContent = '';
    // Populate textContent with records like 'CellText1' --> 'CellText2'
    // Where arrow indicates link between elements

    for (const id in resultList) {
        const cell = cells.find(c => c.id === id);
        if (cell) {
            // Omit cells with inbound but without outbound connections
            if (!resultList[id].length && connectedCells[id])
                continue;
            let text = cellTextContents[cell.id];
            if (resultList[id].length) {
                text = text + ' --> ';
                resultList[id].forEach(nextId => {
                    text = text + cellTextContents[nextId] + '; ';
                });
            }
            text = text + '\n';
            textContent = textContent + text;
        }
    }
    // Copy cells using ui.Clipboard plugin
    clipboard.copyElements(cells, graph);

    // Call save to the system clipboard function
    await saveToClipboard(clipboard.toArray(), textContent);
};

// Function to save cells to the system clipboard
const saveToClipboard = async(cells, textContent) => {
    const json = JSON.stringify(cells);
    const blobJSON = new Blob([json], { type: 'web application/joint' });

    const blobText = new Blob([textContent], { type: 'text/plain' });

    const data = [new ClipboardItem(
        {
            ['text/plain']: blobText,
            ['web application/joint']: blobJSON
        }
    )];

    await navigator.clipboard.write(data);
    await checkClipboardContent();
};

// Function to get data from the system clipboard
async function pasteFromClipboard(point, contextMenu) {
    // Get clipboard items array
    const items = await navigator.clipboard.read();
    for (const item of items) {
        if (item.types.some(t => t === 'web application/joint')) {
            const blob = await item.getType('web application/joint');
            const text = await blob.text();

            const cellsJson = JSON.parse(text);
            const graphJson = { cells: cellsJson };

            const cellNamespace = graph.get('cells').cellNamespace;
            const tmpGraph = new dia.Graph([], { cellNamespace }).fromJSON(graphJson, { sort: false, dry: true });
            const cells = tmpGraph.getCells();

            clipboard.reset(cells);
            // Paste cells using ui.Clipboard functionality
            if (contextMenu) {
                clipboard.pasteCellsAtPoint(graph, point);
            } else {
                clipboard.pasteCells(graph);
            }

            let textContent = '';
            if (item.types.some(t => t === 'text/plain')) {
                const blob = await item.getType('text/plain');
                textContent = await blob.text();
            }

            saveToClipboard(clipboard.toArray(), textContent);
            continue;
        }

        // Check for text clipboard content
        if (item.types.some(t => t === 'text/plain')) {
            const blob = await item.getType('text/plain');
            const text = await blob.text();

            // Insert cells if the content is a valid JSON cell
            try {
                const cellsJson = JSON.parse(text);
                const graphJson = { cells: cellsJson };

                const cellNamespace = graph.get('cells').cellNamespace;
                const tmpGraph = new dia.Graph([], { cellNamespace }).fromJSON(graphJson, { sort: false, dry: true });
                const cells = tmpGraph.getCells();

                clipboard.reset(cells);
                // Paste cells using ui.Clipboard functionality
                if (contextMenu) {
                    clipboard.pasteCellsAtPoint(graph, point);
                } else {
                    clipboard.pasteCells(graph);
                }
                // Insert text as an element with text content from the clipboard
            } catch {
                clipboard.reset(createText(text, { size: { width: 200, height: 120 }}));
                // Paste cells using ui.Clipboard functionality
                clipboard.pasteCellsAtPoint(graph, point);
            }
        }

        // Check for image content
        if (item.types.some(t => t === 'image/png')) {
            const blob = await item.getType('image/png');

            const imageUrl = URL.createObjectURL(blob);
            const tempImage = new Image();
            tempImage.onload = () => {
                const size = {
                    width: tempImage.naturalWidth / 2,
                    height: tempImage.naturalHeight / 2
                };
                const text = `Image (time: ${new Date().toLocaleTimeString()})`;
                const imageCell = createImage(imageUrl, text, { size });
                clipboard.reset(imageCell);
                // Paste cells using ui.Clipboard functionality
                clipboard.pasteCellsAtPoint(graph, point);
            };
            tempImage.src = imageUrl;
        }
    }
}

// Context Toolbar settings

const renderContextToolbar = (point, cellsToCopy = []) => {
    selection.collection.reset(cellsToCopy);
    const contextToolbar = new ui.ContextToolbar({
        target: point,
        root: paper.el,
        padding: 0,
        vertical: true,
        anchor: 'top-left',
        tools: [
            {
                action: 'copy',
                content: 'Copy',
                attrs: {
                    'disabled': cellsToCopy.length === 0
                }
            },
            {
                action: 'paste',
                content: 'Paste',
                attrs: {
                    //'disabled': this.clipboard.isEmpty()
                }
            }]
    });

    contextToolbar.on('action:copy', async() => {
        contextToolbar.remove();

        await copyCells(cellsToCopy);
    });

    contextToolbar.on('action:paste', async() => {
        contextToolbar.remove();

        await pasteFromClipboard(paper.clientToLocalPoint(point), true);
    });

    contextToolbar.render();
};

paper.on('blank:contextmenu', (evt) => {
    renderContextToolbar({ x: evt.clientX, y: evt.clientY });
});

paper.on('cell:contextmenu', (cellView, evt) => {
    renderContextToolbar({ x: evt.clientX, y: evt.clientY }, [cellView.model]);
});

// Default graph declaration
graph.fromJSON({
    cells: [
        {
            id: 'r3',
            type: 'standard.Rectangle',
            position: { x: 50, y: 40 },
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
            position: { x: 50, y: 140 },
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
            position: { x: 50, y: 240 },
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
            position: { x: 210, y: 380 },
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
            position: { x: 350, y: 380 },
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
                { x: 100, y: 410 },
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
                { x: 190, y: 290 },
                { x: 190, y: 170 }
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

// Functions to create elements from the pasted content

function createText(text, attributes) {
    return new shapes.standard.TextBlock({
        size: { width: 100, height: 100 },
        attrs: {
            body: {
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                text,
                style: {
                    fontFamily: 'sans-serif',
                    whiteSpace: 'pre-wrap'
                }
            }
        },
        ...attributes
    });
}

function createImage(href, text, attributes) {
    return new shapes.standard.BorderedImage({
        attrs: {
            label: {
                text
            },
            image: {
                href,
                preserveAspectRatio: 'none'
            }
        },
        ...attributes
    });
}

// Check clipboard content

const table = document.getElementById('clipboard-content-table');
const tableHeader = document.createElement('tr');
const typeHeader = document.createElement('th');
typeHeader.textContent = 'Type';
typeHeader.classList.add('clipboard-content-header-type');
const contentHeader = document.createElement('th');
contentHeader.textContent = 'Content';
tableHeader.replaceChildren(typeHeader, contentHeader);
table.replaceChildren(tableHeader);

const checkClipboardContent = async() => {
    table.replaceChildren(tableHeader);
    const items = await navigator.clipboard.read();
    for (const item of items) {
        if (item.types.some(t => t === 'web application/joint')) {
            const blob = await item.getType('web application/joint');
            const text = await blob.text();

            const record = document.createElement('tr');
            const typeData = document.createElement('td');
            typeData.textContent = 'web application/joint';
            typeData.classList.add('clipboard-content-type');
            const contentData = document.createElement('td');
            const contentDataWrapper = document.createElement('div');
            contentDataWrapper.classList.add('clipboard-content-content');
            contentData.appendChild(contentDataWrapper);
            const textWrapper = document.createElement('pre');
            textWrapper.textContent = JSON.stringify(JSON.parse(text), null, 2);
            contentDataWrapper.appendChild(textWrapper);
            record.replaceChildren(typeData, contentData);
            table.appendChild(record);
        }

        // Check for text clipboard content
        if (item.types.some(t => t === 'text/plain')) {
            const blob = await item.getType('text/plain');
            const text = await blob.text();

            const record = document.createElement('tr');
            const typeData = document.createElement('td');
            typeData.textContent = 'text/plain';
            typeData.classList.add('clipboard-content-type');
            const contentData = document.createElement('td');
            const contentDataWrapper = document.createElement('div');
            contentDataWrapper.classList.add('clipboard-content-content');
            contentData.appendChild(contentDataWrapper);
            const textWrapper = document.createElement('pre');
            textWrapper.textContent = text;
            contentDataWrapper.appendChild(textWrapper);
            record.replaceChildren(typeData, contentData);
            table.appendChild(record);
        }

        // Check for image content
        if (item.types.some(t => t === 'image/png')) {
            const blob = await item.getType('image/png');

            const imageUrl = URL.createObjectURL(blob);

            const record = document.createElement('tr');
            const typeData = document.createElement('td');
            typeData.textContent = 'image/png';
            typeData.classList.add('clipboard-content-type');
            const contentData = document.createElement('td');
            const contentDataWrapper = document.createElement('div');
            contentDataWrapper.classList.add('clipboard-content-content');
            contentData.appendChild(contentDataWrapper);
            const image = document.createElement('img');
            image.src = imageUrl;
            contentDataWrapper.appendChild(image);
            record.replaceChildren(typeData, contentData);
            table.appendChild(record);
        }
    }
};

// Firefox dialog

function showFirefoxBrowserSupportDialog(options = {}) {
    const dialog = new ui.Dialog({
        theme: 'default',
        title: 'Example is restricted',
        width: 320,
        content: `<div>
    Current example uses <a target="_blank" href="https://developer.chrome.com/blog/web-custom-formats-for-the-async-clipboard-api/">custom web formats</a> functionality.
    </div>
    <div>
    At the moment Firefox browser does not implement custom web formats but it is on the way. You can look at the details of the specification <a target="_blank" href="https://github.com/w3c/editing/blob/gh-pages/docs/clipboard-pickling/explainer.md">here</a>.
    </div>`,
        buttons: [
            { action: 'ok', content: 'Ok', position: 'center' },
        ]
    });

    dialog.open();
    dialog.on({
        'action:ok': function() {
            dialog.remove();
        },
    });
}

// Safari dialog

function showSafariBrowserSupportDialog(options = {}) {
    const dialog = new ui.Dialog({
        theme: 'default',
        title: 'Example is restricted',
        width: 320,
        content: `<div>
    Current example uses <a target="_blank" href="https://developer.chrome.com/blog/web-custom-formats-for-the-async-clipboard-api/">custom web formats</a> and Clipboard API functionality.
    </div>
    <div>
    At the moment Safari browser does not implement custom web formats. We recommend opening this demo in Chromium-based browser.
    </div>`,
        buttons: [
            { action: 'ok', content: 'Ok', position: 'center' },
        ]
    });

    dialog.open();
    dialog.on({
        'action:ok': function() {
            dialog.remove();
        },
    });
}

if (navigator.userAgent.includes('Firefox')) {
    showFirefoxBrowserSupportDialog();
}

if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
    showSafariBrowserSupportDialog();
}

document.getElementById('refresh').addEventListener('click', () => {
    checkClipboardContent();
});

window.addEventListener('focus', async() => {
    await checkClipboardContent();
});

window.addEventListener('load', async() => {
    await checkClipboardContent();
});
