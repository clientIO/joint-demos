import { dia, shapes, mvc, ui, highlighters, util, V, g } from '@joint/plus';
import './styles.css';

const paperContainerEl = document.getElementById('paper-container');
const stencilContainerEl = document.getElementById('stencil-container');
// Paper
// -----

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' },
    defaultLink: () => new shapes.standard.Link(),
    defaultConnectionPoint: { name: 'boundary' },
    clickThreshold: 10,
    magnetThreshold: 'onleave',
    linkPinning: false,
    validateConnection: (sourceView, _, targetView) => sourceView !== targetView,
    snapLinks: { radius: 10 }
});
paperContainerEl.appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

paper.on('element:magnet:pointerclick', (elementView, evt, magnet) => {
    paper.removeTools();
    elementView.addTools(new dia.ToolsView({ tools: [new Ports()] }));
});

paper.on('blank:pointerdown cell:pointerdown', () => {
    paper.removeTools();
});

// Stencil
// -------

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
    groups: {
        elements: {},
        ports: {}
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
    dragStartClone: (cell) => {
        const clone = cell.clone();
        if (clone.get('port')) {
            const { width, height } = clone.size();
            clone.attr('body/fill', 'lightgray');
            // Maker sure the center of the port is in the grid.
            clone.attr('body/transform', `translate(-${width / 2}, -${height / 2})`);
        } else {
            clone.resize(200, 200);
        }
        return clone;
    }
});

stencil.render();
stencilContainerEl.appendChild(stencil.el);

const stencilElements = [
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                fill: '#80ffd5'
            }
        }
    },
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                rx: 10,
                ry: 10,
                fill: '#48cba4'
            }
        }
    }
];

// Every stencil port element has to have a `port` property.
// The `port` property describes the port itself after it's dropped on the paper.
const stencilPorts = [
    {
        type: 'standard.Rectangle',
        size: { width: 24, height: 24 },
        attrs: {
            body: {
                fill: '#ff9580'
            }
        },
        port: {
            markup: util.svg/*xml*/ `
                <rect @selector="portBody"
                    x="-12"
                    y="-12"
                    width="24"
                    height="24"
                    fill="#ff9580"
                    stroke="#333333"
                    stroke-width="2"
                    magnet="active"
                />
            `
        }
    },
    {
        type: 'standard.Path',
        size: { width: 30, height: 30 },
        attrs: {
            body: {
                d:
                    'M calc(0.5*w) 0 calc(w) calc(0.5*h) calc(0.5*w) calc(h) 0 calc(0.5*h) Z',
                fill: '#c86653',
                stroke: '#333333'
            }
        },
        port: {
            markup: util.svg/*xml*/ `
                <path @selector="portBody"
                    d="M 0 -15 L 15 0 L 0 15 L -15 0 Z"
                    fill="#c86653"
                    stroke="#333333"
                    stroke-width="2"
                    magnet="active"
                />
            `
        }
    },
    {
        type: 'standard.Circle',
        size: { width: 30, height: 30 },
        attrs: {
            body: {
                fill: '#80aaff',
                stroke: '#333333'
            }
        },
        port: {
            markup: util.svg/*xml*/ `
                <circle @selector="portBody"
                    r="15"
                    fill="#80aaff"
                    stroke="#333333"
                    stroke-width="2"
                    magnet="active"
                />
            `
        }
    }
];

stencilElements.forEach(
    (element) =>
        (element.ports = {
            groups: {
                absolute: {
                    position: 'absolute',
                    label: {
                        position: { name: 'inside', args: { offset: 22 }},
                        markup: util.svg/*xml*/ `
                    <text @selector="portLabel"
                        y="0.3em"
                        fill="#333"
                        text-anchor="middle"
                        font-size="15"
                        font-family="sans-serif"
                    />
                `
                    }
                }
            },
            items: []
        })
);

stencil.load({
    elements: stencilElements,
    ports: stencilPorts
});

let portIdCounter = 1;

function addElementPort(element, port, position) {
    const portId = `P-${portIdCounter++}`;
    element.addPort({
        id: portId,
        group: 'absolute',
        args: position,
        ...util.merge(port, {
            attrs: {
                portLabel: {
                    text: portId
                }
            }
        })
    });
    return portId;
}

stencil.on({
    'element:dragstart': (cloneView, evt) => {
        const clone = cloneView.model;
        evt.data.isPort = clone.get('port');
        paper.removeTools();
    },
    'element:dragstart element:drag': (cloneView, evt, cloneArea) => {
        if (!evt.data.isPort) {
            return;
        }
        // Note: cloneArea `topLeft` points to the center of the port because of
        // the `translate(-${width/2}, -${height/2})` transform we added to the port
        // in the `dragStartClone` callback.
        const [dropTarget] = graph.findModelsFromPoint(cloneArea.topLeft());
        if (dropTarget) {
            evt.data.dropTarget = dropTarget;
            highlighters.mask.add(
                dropTarget.findView(paper),
                'body',
                'valid-drop-target',
                {
                    layer: dia.Paper.Layers.BACK,
                    attrs: {
                        stroke: '#9580ff',
                        'stroke-width': 2
                    }
                }
            );
            highlighters.addClass.removeAll(cloneView.paper, 'invalid-drop-target');
        } else {
            evt.data.dropTarget = null;
            highlighters.addClass.add(cloneView, 'body', 'invalid-drop-target', {
                className: 'invalid-drop-target'
            });
            highlighters.mask.removeAll(paper, 'valid-drop-target');
        }
    },
    'element:dragend': (cloneView, evt, cloneArea) => {
        if (!evt.data.isPort) {
            return;
        }
        const clone = cloneView.model;
        const { dropTarget } = evt.data;
        if (dropTarget) {
            stencil.cancelDrag();
            addElementPort(
                dropTarget,
                clone.get('port'),
                cloneArea.topLeft().difference(dropTarget.position()).toJSON()
            );
        } else {
            // An invalid drop target. Animate the port back to the stencil.
            stencil.cancelDrag({ dropAnimation: true });
        }
        highlighters.mask.removeAll(paper, 'valid-drop-target');
    }
});

// Port Move Tool
// --------------

// A custom element tool that allows to move a port of an element.
// The source code comes from `linkTools.Segment` and has been modified for this sample.

const PortHandle = mvc.View.extend({
    tagName: 'circle',
    svgElement: true,
    className: 'port-handle',
    events: {
        mousedown: 'onPointerDown',
        touchstart: 'onPointerDown'
    },
    documentEvents: {
        mousemove: 'onPointerMove',
        touchmove: 'onPointerMove',
        mouseup: 'onPointerUp',
        touchend: 'onPointerUp',
        touchcancel: 'onPointerUp'
    },
    attributes: {
        r: 20,
        fill: 'transparent',
        stroke: '#002b33',
        'stroke-width': 2,
        cursor: 'grab'
    },
    position: function(x, y) {
        this.vel.attr({ cx: x, cy: y });
    },
    color: function(color) {
        this.el.style.stroke = color || this.attributes.stroke;
    },
    onPointerDown: function(evt) {
        if (this.options.guard(evt)) return;
        evt.stopPropagation();
        evt.preventDefault();
        this.options.paper.undelegateEvents();
        this.delegateDocumentEvents(null, evt.data);
        this.trigger('will-change', this, evt);
    },
    onPointerMove: function(evt) {
        this.trigger('changing', this, evt);
    },
    onPointerUp: function(evt) {
        if (evt.detail === 2) {
            this.trigger('remove', this, evt);
        } else {
            this.trigger('changed', this, evt);
            this.undelegateDocumentEvents();
        }
        this.options.paper.delegateEvents();
    }
});

const Ports = dia.ToolView.extend({
    name: 'ports',
    options: {
        handleClass: PortHandle,
        activeColor: '#4666E5'
    },
    children: [
        {
            tagName: 'circle',
            selector: 'preview',
            className: 'joint-ports-preview',
            attributes: {
                r: 13,
                'stroke-width': 2,
                fill: '#4666E5',
                'fill-opacity': 0.3,
                stroke: '#4666E5',
                'pointer-events': 'none'
            }
        }
    ],
    handles: null,
    onRender: function() {
        this.renderChildren();
        this.updatePreview(null);
        this.resetHandles();
        this.renderHandles();
        return this;
    },
    update: function() {
        const positions = this.getPortPositions();
        if (positions.length === this.handles.length) {
            this.updateHandles();
        } else {
            this.resetHandles();
            this.renderHandles();
        }
        this.updatePreview(null);
        return this;
    },
    resetHandles: function() {
        const handles = this.handles;
        this.handles = [];
        this.stopListening();
        if (!Array.isArray(handles)) return;
        for (let i = 0, n = handles.length; i < n; i++) {
            handles[i].remove();
        }
    },
    renderHandles: function() {
        const positions = this.getPortPositions();
        for (let i = 0, n = positions.length; i < n; i++) {
            const position = positions[i];
            const handle = new this.options.handleClass({
                index: i,
                portId: position.id,
                paper: this.paper,
                guard: (evt) => this.guard(evt)
            });
            handle.render();
            handle.position(position.x, position.y);
            this.simulateRelatedView(handle.el);
            handle.vel.appendTo(this.el);
            this.handles.push(handle);
            this.startHandleListening(handle);
        }
    },
    updateHandles: function() {
        const positions = this.getPortPositions();
        for (let i = 0, n = positions.length; i < n; i++) {
            const position = positions[i];
            const handle = this.handles[i];
            if (!handle) return;
            handle.position(position.x, position.y);
        }
    },
    updatePreview: function(x, y) {
        const { preview } = this.childNodes;
        if (!preview) return;
        if (!Number.isFinite(x)) {
            preview.setAttribute('display', 'none');
        } else {
            preview.removeAttribute('display');
            preview.setAttribute('transform', `translate(${x},${y})`);
        }
    },
    startHandleListening: function(handle) {
        this.listenTo(handle, 'will-change', this.onHandleWillChange);
        this.listenTo(handle, 'changing', this.onHandleChanging);
        this.listenTo(handle, 'changed', this.onHandleChanged);
        this.listenTo(handle, 'remove', this.onHandleRemove);
    },
    onHandleWillChange: function(handle, evt) {
        this.focus();
        handle.color(this.options.activeColor);
        const portNode = this.relatedView.findPortNode(
            handle.options.portId,
            'root'
        );
        portNode.style.opacity = 0.2;
    },
    onHandleChanging: function(handle, evt) {
        const { x, y } = this.getPositionFromEvent(evt);
        this.updatePreview(x, y);
    },
    onHandleChanged: function(handle, evt) {
        const { relatedView } = this;
        const { model } = relatedView;
        const portId = handle.options.portId;
        handle.color(null);
        const portNode = this.relatedView.findPortNode(portId, 'root');
        portNode.style.opacity = '';
        this.updatePreview(null);
        const delta = this.getPositionFromEvent(evt).difference(
            relatedView.model.position()
        );
        model.portProp(
            portId,
            'args',
            { x: delta.x, y: delta.y },
            { rewrite: true, tool: this.cid }
        );
        this.resetHandles();
        this.renderHandles();
    },
    onHandleRemove: function(handle, evt) {
        const { relatedView } = this;
        const { model } = relatedView;
        const portId = handle.options.portId;
        handle.color(null);
        const portNode = this.relatedView.findPortNode(portId, 'root');
        portNode.style.opacity = '';
        this.updatePreview(null);
        model.removePort(portId, { tool: this.cid });
        this.resetHandles();
        this.renderHandles();
    },
    // Get an array with all the port positions.
    getPortPositions: function() {
        const { relatedView } = this;
        const translateMatrix = relatedView.getRootTranslateMatrix();
        const rotateMatrix = relatedView.getRootRotateMatrix();
        const matrix = translateMatrix.multiply(rotateMatrix);
        const groupNames = Object.keys(relatedView.model.prop('ports/groups'));
        const portsPositions = {};
        for (let i = 0, n = groupNames.length; i < n; i++) {
            Object.assign(
                portsPositions,
                relatedView.model.getPortsPositions(groupNames[i])
            );
        }
        const positions = [];
        for (const id in portsPositions) {
            const point = V.transformPoint(portsPositions[id], matrix);
            positions.push({
                x: point.x,
                y: point.y,
                id
            });
        }
        return positions;
    },
    // Get the port position from the event coordinates.
    // The position is snapped to the point inside the element's bbox.
    getPositionFromEvent: function(evt) {
        const { relatedView } = this;
        const bbox = relatedView.model.getBBox();
        const [, x, y] = relatedView.paper.getPointerArgs(evt);
        const p = new g.Point(x, y);
        if (bbox.containsPoint(p)) {
            return p;
        }
        return bbox.pointNearestToPoint(p);
    },
    onRemove: function() {
        this.resetHandles();
    }
});

// Example graph
// -------------

graph.addCells([
    {
        ...stencilElements[0],
        id: 'r1',
        position: { x: 40, y: 100 },
        size: { width: 200, height: 200 }
    },
    {
        ...stencilElements[1],
        id: 'r2',
        position: { x: 400, y: 100 },
        size: { width: 200, height: 200 }
    }
]);

const r1 = graph.getCell('r1');
const r1p1 = addElementPort(r1, stencilPorts[0].port, { x: '100%', y: 20 });
const r1p2 = addElementPort(r1, stencilPorts[0].port, { x: '100%', y: 60 });
addElementPort(r1, stencilPorts[0].port, { x: '100%', y: 100 });
addElementPort(r1, stencilPorts[2].port, { x: '100%', y: 180 });

const r2 = graph.getCell('r2');
const r2p1 = addElementPort(r2, stencilPorts[1].port, { x: 0, y: 40 });
const r2p2 = addElementPort(r2, stencilPorts[1].port, { x: 0, y: 160 });

graph.addCells([
    {
        type: 'standard.Link',
        source: { id: 'r1', port: r1p1 },
        target: { id: 'r2', port: r2p1 }
    },
    {
        type: 'standard.Link',
        source: { id: 'r1', port: r1p2 },
        target: { id: 'r2', port: r2p2 }
    }
]);

graph
    .getCell('r2')
    .findView(paper)
    .addTools(
        new dia.ToolsView({
            tools: [new Ports()]
        })
    );
