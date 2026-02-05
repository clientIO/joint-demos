import { dia, ui, util, shapes, layout } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import './shapes';

export const init = () => {
    
    const canvas = document.getElementById('canvas');
    
    const graph = new dia.Graph();
    
    const paper = new dia.Paper({
        model: graph,
        width: 1,
        height: 1,
        gridSize: 10,
        interactive: false,
        async: true,
        frozen: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#F3F7F6' }
    });
    
    const scroller = new ui.PaperScroller({
        paper,
        cursor: 'grab',
        padding: 0,
        contentOptions: {
            allowNewOrigin: 'any',
            useModelGeometry: true,
            padding: 1000
        }
    });
    
    canvas.appendChild(scroller.el);
    scroller.render().center();
    scroller.lock();
    
    createCells(structure, graph);
    layoutCells(graph);
    rescale(scroller);
    paper.unfreeze();
    
    // register events
    window.addEventListener('resize', util.debounce(() => rescale(scroller)), false);
    
    paper.on('element:pointermove', (view, evt, x, y) => {
        const model = view.model;
        if (!model.isEmbedded()) {
            return;
        }
        const data = evt.data;
        let ghost = data.ghost;
        if (!ghost) {
            const position = model.position();
            ghost = view.vel.clone();
            ghost.node.style.transition = '0.2s opacity';
            ghost.appendTo(paper.viewport);
            evt.data.ghost = ghost;
            evt.data.dx = x - position.x;
            evt.data.dy = y - position.y;
        }
        ghost.attr('opacity', findContainerFromPoint(paper.model, x, y) ? 0.9 : 0.2);
        ghost.attr('transform', `translate(${[x - data.dx, y - data.dy]})`);
    });
    
    paper.on('element:pointerup', (view, evt, x, y) => {
        const data = evt.data;
        if (!data.ghost) {
            return;
        }
        data.ghost.remove();
        const model = view.model;
        const paperModel = paper.model;
        const newParent = findContainerFromPoint(paperModel, x, y);
        if (!newParent) {
            return;
        }
        const parent = model.getParentCell();
        paper.freeze();
        if (parent) {
            parent.unembed(model);
        }
        newParent.embed(model);
        model.attr(['body', 'fill'], newParent.get('childFill'));
        layoutCells(paperModel);
        paper.unfreeze();
        rescale(scroller);
    });
};

const rescale = (scroller) => {
    scroller.zoomToFit({ padding: 50, useModelGeometry: true });
};

const structure = {
    label: 'a1',
    parentFill: '#202E66',
    childFill: '#2C408F',
    children: [{
            label: 'b1',
            embeds: ['e1', 'e2', 'e3'],
            parentFill: '#334AA6',
            childFill: '#3F5BCC',
            children: [{
                    parentFill: '#4767E6',
                    childFill: '#4B6DF2',
                    label: 'c1',
                    embeds: ['d1', 'd2', 'd3']
                }, {
                    parentFill: '#4767E6',
                    childFill: '#4B6DF2',
                    label: 'c2',
                    embeds: ['d4', 'd5', 'd6']
                }]
        }, {
            label: 'b2',
            parentFill: '#334AA6',
            childFill: '#3F5BCC',
            children: [{
                    parentFill: '#4767E6',
                    childFill: '#4B6DF2',
                    label: 'c3',
                    embeds: ['d7', 'd8', 'd9', 'd10', 'd11']
                }]
        }]
};

const findContainerFromPoint = (graph, x, y) => {
    const modelsFromPoint = graph.findModelsFromPoint({ x: x, y: y });
    return modelsFromPoint.filter(shapes.app.Container.isContainer)[0];
};

const createCells = (struct, graph) => {
    
    const label = struct.label;
    const children = struct.children || [];
    const embeds = struct.embeds || [];
    const root = new shapes.app.Container({
        attrs: {
            label: {
                text: label
            },
            body: {
                fill: struct.parentFill
            }
        },
        childFill: struct.childFill
    });
    root.addTo(graph);
    
    if (embeds.length > 0) {
        embeds.forEach((text) => {
            const embed = new shapes.app.Child({
                attrs: {
                    label: {
                        text: text
                    },
                    body: {
                        fill: struct.childFill
                    }
                }
            });
            embed.resize(50, 50);
            embed.addTo(graph);
            root.embed(embed);
        });
        
    }
    else {
        root.resize(60, 60);
    }
    
    if (children.length > 0) {
        children.forEach((childStruct) => {
            const child = createCells(childStruct, graph);
            const link = new shapes.app.Link();
            link.source(root, { anchor: { name: 'bottom', args: { dy: -20 } } });
            link.target(child, { anchor: { name: 'top' } });
            link.addTo(graph);
        });
    }
    
    return root;
};

const gridPathData = (metrics, offset, padding) => {
    const bbox = metrics.bbox;
    const x = bbox.x + offset.left;
    const y = bbox.y + offset.top;
    const w = bbox.width;
    const h = bbox.height;
    // Boundary of embedded cells
    const data = [
        'M',
        x - padding, y - padding,
        x + w + padding, y - padding,
        x + w + padding, y + h + padding,
        x - padding, y + h + padding,
        'Z'
    ];
    metrics.gridX.forEach((gx, index, gridX) => {
        // Skip the first and last line
        if (index === 0 || index === gridX.length - 1) {
            return;
        }
        data.push('M', gx + x, y - padding, gx + x, y + h + padding);
    });
    metrics.gridY.forEach((gy, index, gridY) => {
        // Skip the first and last line
        if (index === 0 || index === gridY.length - 1) {
            return;
        }
        data.push('M', x - padding, gy + y, x + w + padding, gy + y);
    });
    return data.join(' ');
};

const layoutCells = (graph) => {
    
    const directedGraphCells = graph.getLinks();
    
    graph.getElements().forEach((container) => {
        
        if (!shapes.app.Container.isContainer(container)) {
            return;
        }
        directedGraphCells.push(container);
        
        const embeds = container.getEmbeddedCells();
        const embedsCount = embeds.length;
        if (embedsCount === 0) {
            container.attr(['grid', 'd'], 'M 5 35 45 35');
            container.resize(50, 50);
            return;
        }
        
        const padding = { horizontal: 10, bottom: 10, top: 40 };
        const metrics = layout.GridLayout.layout(embeds, {
            columns: Math.ceil(embedsCount / 2),
            columnGap: 10,
            rowGap: 10
        });
        container.fitEmbeds({ padding });
        container.attr(['grid', 'd'], gridPathData(metrics, util.normalizeSides(padding), 5));
    });
    
    DirectedGraph.layout(directedGraphCells, {
        setPosition: (el, center) => {
            const size = el.size();
            el.position(center.x - size.width / 2, center.y - size.height / 2, { deep: true });
        }
    });
};
