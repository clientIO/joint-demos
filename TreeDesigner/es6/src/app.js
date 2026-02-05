import { dia, shapes, highlighters, mvc, ui } from '@joint/plus';
import { createInspector } from './inspector';
import { generateTree } from './layout';
import data from './data';

export const init = () => {
    // Create Graph & Paper
    // --------------------
    
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    
    const paper = new dia.Paper({
        el: document.getElementById('paper'),
        cellViewNamespace: shapes,
        width: 'auto',
        height: '100%',
        model: graph,
        interactive: false,
        async: true,
        autoFreeze: true,
        sorting: dia.Paper.sorting.APPROX,
        defaultConnector: { name: 'straight', args: { cornerType: 'cubic' } },
        defaultAnchor: { name: 'perpendicular' },
        background: { color: '#FBFBFB' },
        clickThreshold: 10,
        viewManagement: {
            disposeHidden: true,
        },
        cellVisibility: (cell) => {
            if (cell.isLink()) {
                return !cell.getSourceCell().get('hidden') && !cell.getTargetCell().get('hidden');
            }
            // Always show the element if it is highlighted/selected
            if (cell.get('highlighted'))
                return true;
            return !cell.get('hidden');
        },
    });
    
    // Data Model
    
    const dataModel = new dia.Cell({
        // Each cell needs to have a type in order to be added to the graph
        type: 'data',
        data,
    });
    
    // Inspector
    // Works with the data model (not the graph associated with the paper)
    
    const inspector = createInspector(dataModel);
    inspector.render();
    document.getElementById('inspector').appendChild(inspector.el);
    
    // Undo & redo
    // The command manager expects a graph, so we add the data model to a new graph
    
    const historyGraph = new dia.Graph({}, { cellNamespace: shapes });
    historyGraph.addCell(dataModel);
    
    const history = new dia.CommandManager({
        graph: historyGraph,
        stackLimit: 20
    });
    
    // Toolbar
    
    const toolbar = new ui.Toolbar({
        tools: [
            {
                type: 'undo',
            },
            {
                type: 'redo',
            },
            {
                type: 'button',
                text: 'New',
                name: 'new',
            }
        ],
        autoToggle: true,
        references: {
            commandManager: history
        }
    });
    
    document.getElementById('toolbar').appendChild(toolbar.el);
    toolbar.render();
    
    // Events
    
    const controller = new mvc.Listener();
    
    controller.listenTo(paper, {
        'element:pointerclick': (elementView) => {
            const element = elementView.model;
            const path = element.get('path');
            const inspectorFieldEl = inspector.el.querySelector(`[data-field='${path}']`);
            const inspectorListItemEl = inspectorFieldEl && inspectorFieldEl.closest('.list-item');
            unhighlightFields(inspector);
            highlightField(inspector, inspectorListItemEl, element, { blur: true });
        },
        'blank:pointerclick': () => {
            unhighlightFields(inspector);
            paper.wakeUp();
        },
        'element:mouseenter': (elementView) => {
            const selector = elementView.model.get('selector') || 'body';
            highlighters.mask.add(elementView, selector, 'hover', {
                padding: 2,
                attrs: {
                    stroke: '#2588C4',
                    strokeOpacity: 0.75,
                    strokeWidth: 2,
                }
            });
        },
        'element:mouseleave': (elementView) => {
            highlighters.mask.remove(elementView, 'hover');
        }
    });
    
    controller.listenTo(toolbar, {
        'new:pointerclick': () => clearData()
    });
    
    inspector.el.addEventListener('focusin', (evt) => {
        const targetEl = evt.target;
        const listItemEl = targetEl.closest('.list-item');
        let element;
        if (!listItemEl) {
            const rootNode = dataModel.get('data');
            element = graph.getCell(rootNode.id);
        }
        else {
            const fieldEl = listItemEl.querySelector(':scope > [data-field]');
            const path = fieldEl.dataset.field;
            const node = dataModel.prop(path);
            element = node && graph.getCell(node.id);
        }
        if (!element)
            return;
        unhighlightFields(inspector);
        highlightField(inspector, listItemEl, element, { scroll: false });
    });
    
    // Diagram updates
    
    let diagramBBox = updateDiagram();
    
    controller.listenTo(history, {
        'stack': () => {
            diagramBBox = updateDiagram();
        }
    });
    
    window.onresize = () => zoomToFit(paper, diagramBBox);
    
    // Functions
    
    function highlightField(inspector, inspectorFieldEl, element, options = {}) {
        const { scroll = true, blur = false } = options;
        if (blur) {
            document.activeElement.blur();
        }
        if (inspectorFieldEl) {
            inspectorFieldEl.classList.add('highlighted');
            scroll && inspectorFieldEl.scrollIntoView({ behavior: 'smooth' });
        }
        else {
            // Highlight the top-most element in the inspector
            inspector.el.classList.add('highlighted');
            scroll && inspector.el.scrollTo({ top: 0, behavior: 'smooth' });
            
        }
        highlighters.mask.removeAll(paper, 'selection');
        highlighters.mask.add(element.findView(paper), element.get('selector') || 'body', 'selection', {
            layer: dia.Paper.Layers.FRONT,
            padding: 2,
            attrs: {
                strokeWidth: 2,
                stroke: '#2A93CB'
            }
        });
        
        element.set('highlighted', true);
    }
    
    function unhighlightFields(inspector) {
        inspector.el.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
        inspector.el.classList.remove('highlighted');
        
        highlighters.mask.removeAll(paper, 'selection');
        
        graph.getElements().forEach(element => element.set('highlighted', false));
    }
    
    
    function updateDiagram() {
        const data = dataModel.get('data');
        const graphBBox = generateTree(graph, data);
        
        // An element could be replaced by a new one when the type changes.
        // We need to highlight the new element again.
        const selectedElement = graph.getElements().find(element => element.get('highlighted'));
        if (selectedElement) {
            highlightField(inspector, null, selectedElement, { scroll: false });
        }
        
        // Check for hidden elements
        paper.wakeUp();
        
        zoomToFit(paper, graphBBox);
        
        return graphBBox;
    }
    
    function clearData() {
        dataModel.set('data', {
            id: 'root',
            type: 'device',
            connections: 'none',
            children: []
        });
        const root = graph.getCell('root');
        highlightField(inspector, null, root, { scroll: false });
    }
};


function zoomToFit(paper, contentArea) {
    // Fit the paper to the content with a padding of 20 pixels
    paper.transformToFitContent({
        contentArea,
        useModelGeometry: true,
        padding: 20,
        maxScale: 5,
        verticalAlign: 'middle',
        horizontalAlign: 'middle'
    });
}
