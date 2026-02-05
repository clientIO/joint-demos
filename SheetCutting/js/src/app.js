import { dia, util, ui, format } from '@joint/plus';
import { Polygon } from './polygon';
import { highlightOverlaps, unhighlightOverlaps, highlightOverflow, unhighlightOverflow } from './overlaps';
import { selectElement, unselectElement } from './selection';

const cellNamespace = { Polygon };
const graph = new dia.Graph({}, { cellNamespace });

const A4 = { width: 210, height: 297 };

export const init = () => {
    const paper = new dia.Paper({
        cellViewNamespace: cellNamespace,
        width: A4.height * 3,
        height: A4.width * 3,
        gridSize: 1,
        model: graph,
        overflow: true,
        restrictTranslate: true,
        background: {
            color: '#fff'
        }
    });
    
    document.getElementById('paper').appendChild(paper.el);
    
    // Snaplines
    
    const paperBBox = paper.getArea();
    
    const snaplines = new ui.Snaplines({
        paper,
        additionalSnapPoints: (elementView) => {
            if (elementView.paper === paper)
                return [];
            // Snap to the corners of the paper only
            // if the element is being dragged from another paper i.e. stencil
            return [
                paperBBox.topLeft(),
                paperBBox.bottomRight()
            ];
        }
    });
    
    const stencil = new ui.Stencil({
        paper,
        dropAnimation: true,
        width: 140,
        height: null, // auto height based on the content
        snaplines,
        layout: {
            marginY: 10,
            rowGap: 10,
            columnWidth: 140,
            columns: 2,
            rowHeight: 'compact',
        },
        dragEndClone: (el) => {
            const elClone = el.clone();
            elClone.addMarker();
            return elClone;
        }
    });
    
    stencil.render();
    
    stencil.getPaper().scale(0.5);
    
    document.getElementById('stencil').appendChild(stencil.el);
    
    stencil.on('element:drag', (cloneView, evt, targetArea, validDropTarget) => {
        const position = targetArea.round().topLeft();
        const clone = cloneView.model;
        if (!validDropTarget || clone.isWithinBBox(paper.getArea(), { position })) {
            highlightOverflow(cloneView);
            evt.data.overflown = true;
        }
        else {
            unhighlightOverflow(cloneView);
            highlightOverlaps(cloneView, paper, { position });
            evt.data.overflown = false;
        }
    });
    
    stencil.on('element:dragend', (_cloneView, evt, _targetArea, validDropTarget) => {
        unhighlightOverlaps(paper);
        if (validDropTarget && evt.data.overflown) {
            stencil.cancelDrag({ dropAnimation: true });
        }
    });
    
    // Validations
    // -----------
    
    paper.on('element:pointerup', () => {
        unhighlightOverlaps(paper);
    });
    
    graph.on('batch:stop', (opt) => {
        if (opt.batchName === 'control-move') {
            // The use finished rotating the element
            unhighlightOverlaps(paper);
        }
    });
    
    const highlightOverlapsDebounced = util.debounce(highlightOverlaps, 10);
    
    graph.on('change:angle change:position', (element) => {
        highlightOverlapsDebounced(element.findView(paper), paper);
    });
    
    // History
    
    const history = new dia.CommandManager({
        graph,
        cmdBeforeAdd: (_cmdName, _cell, _collection, options = {}) => {
            return !options.ignoreHistory;
        }
    });
    
    // Toolbar
    // -------
    
    const toolbar = new ui.Toolbar({
        tools: [{
                type: 'undo',
                text: '⇤'
            }, {
                type: 'redo',
                text: '⇥'
            }, {
                type: 'separator'
            }, {
                type: 'checkbox',
                name: 'snaplines',
                label: 'Snaplines',
                value: true
            }, {
                type: 'separator'
            }, {
                type: 'button',
                name: 'print',
                text: '🖨'
            }],
        autoToggle: true,
        references: {
            commandManager: history
        }
    });
    
    document.getElementById('toolbar').appendChild(toolbar.el);
    toolbar.render();
    
    toolbar.on('print:pointerclick', () => {
        unselectElement(paper);
        format.print(paper, { area: paper.getArea() });
    });
    
    toolbar.on('snaplines:change', (checked) => {
        if (checked) {
            snaplines.enable();
        }
        else {
            snaplines.disable();
        }
    });
    
    // Selection
    // ---------
    
    paper.on('element:pointerdown', (elementView) => {
        selectElement(elementView);
    });
    
    paper.on('blank:pointerdown', () => {
        unselectElement(paper);
    });
    
    stencil.on('element:dragstart', () => {
        unselectElement(paper);
    });
    
    stencil.on('element:drop', (cellView) => {
        selectElement(cellView);
    });
    
    // Cloning elements
    // ----------------
    
    paper.on('element:pointerdown', (elementView, evt) => {
        if (!evt.ctrlKey && !evt.metaKey)
            return;
        // Here we create a clone of the element that is being dragged
        // but we keep dragging the original element.
        // It's ok since the both elements are identical.
        const clone = elementView.model.clone();
        graph.addCell(clone);
    });
    
    // Example
    // -------
    
    const stencilPaths = [
        // Tall rectangle
        'M 0,0 50,0 50,300 0,300 Z',
        // Tall narrow rectangle
        'M 0,0 30,0 30,300 0,300 Z',
        // Half of tall rectangle
        'M 0,0 50,0 50,150 0,150 Z',
        // Half of tall narrow rectangle
        'M 0,0 30,0 30,150 0,150 Z',
        // Arrows
        'M 0 0 H 100 V 100 Z',
        'M 0,0 100,0 50,100 Z',
        'M 0,0 50,100 100,0 Q 50,50 0,0 Z',
        'M 0,0 100,50 0,100 25,50 0,0 Z',
        // Cross
        'M 0,40 40,40 40,0 60,0 60,40 100,40 100,60 60,60 60,100 40,100 40,60 0,60 Z',
        // Sheared rectangle
        'M 10 0 H 90 l 10 10 V 90 l -10 10 H 10 l -10 -10 V 10 Z',
        // Diamond
        'M 50,0 100,50 50,100 0,50 50,0 Z',
        // Pentagon
        'M 50,0 100,38 82,100 18,100 0,38 Z',
        // Hexagon
        'M 0,50 25,0 75,0 100,50 75,100 25,100 Z',
        // Octagon
        'M 0,40 40,0 60,0 100,40 100,60 60,100 40,100 0,60 Z',
        // Heart
        'M 10,30 A 20,20 0,0,1 50,30 A 20,20 0,0,1 90,30 Q 90,60 50,90 Q 10,60 10,30 z',
        // Star
        'M 0,42.5 37.5,37.5 50,5 62.5,37.5 100,42.5 75,62.5 80,100 50,85 20,100 25,62.5 0,42.5 Z',
        // Rectangle
        'M 0,0 100,0 100,50 0,50 Z',
        // Rounded rectangle
        'M 10,0 Q 0,0 0,10 L 0,40 Q 0,50 10,50 L 90,50 Q 100,50 100,40 L 100,10 Q 100,0 90,0 Z',
        // Circle
        'M 0,50 A 50,50 0 1,0 100,50 A 50,50 0 1,0 0,50 Z',
        // Quarter circle
        'M 0,50 A 50,50 0 1,0 50,100 L 50,50 Z',
        // Ellipse
        'M 0,50 A 50,25 0 1,0 100,50 A 50,25 0 1,0 0,50 Z',
        // Half circle
        'M 0,50 A 50,50 0 1,0 100,50 L 50,50 Z',
    ];
    stencil.load(stencilPaths.map(d => Polygon.fromPathData(d)));
    
    // Leftovers
    // ---------
    
    graph.on('add remove', () => updateLeftovers());
    
    const leftoversEl = document.getElementById('leftovers');
    
    function updateLeftovers() {
        const area = graph.getElements().reduce((acc, el) => acc + el.calcArea(), 0);
        const { width, height } = paper.getArea();
        const paperArea = width * height;
        const leftover = 100 * (1 - area / paperArea);
        leftoversEl.textContent = `Leftovers: ${leftover.toFixed(2)}%`;
    }
    
    updateLeftovers();
    
    // Examples
    // --------
    
    graph.startBatch('example');
    for (let i = 0; i < 5; i++) {
        const w = 50;
        const h = 150;
        graph.addCell(Polygon.fromPathData(stencilPaths[0]).position(2 * i * w, 0).addMarker());
        graph.addCell(Polygon.fromPathData(stencilPaths[2]).position((2 * i + 1) * w, 0).addMarker());
        graph.addCell(Polygon.fromPathData(stencilPaths[0]).position((2 * i + 1) * w, h).addMarker());
        graph.addCell(Polygon.fromPathData(stencilPaths[0]).position(2 * i * w, 2 * h).addMarker());
    }
    graph.stopBatch('example');
    
    selectElement(graph.getElements().at(-2).findView(paper));
};
