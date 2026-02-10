import { dia, shapes, mvc, ui, highlighters } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { TaskElement, TaskElementView } from './TaskElement';
import { DependencyLink } from './DependencyLink';
import * as paperOptions from './paper-options';
import Badges from './Badges';
import AssigneeTags from './AssigneeTags';
import NavigatorElementView from './NavigatorElementView';
import { initializeAssignments } from './assignments';
import { initializeToolbar } from './toolbar';

import './index.scss';

import { initializeTooltips } from './tooltips';

export default class PertChart extends mvc.View {

    constructor(options) {
        super(options);
    }

    preinitialize() {
        this.zoomSettings = {
            padding: 20,
            min: 0.2,
            max: 4,
            step: 0.05,
        };
        this.className = 'pert-chart';
        this.style = {
            position: 'relative',
            width: '100%',
            height: '100%'
        };
    }

    initialize() {

        const cellNamespace = {
            ...shapes,
            task: TaskElement,
            taskView: TaskElementView,
            dependency: DependencyLink,
        };

        const graph = new dia.SearchGraph({}, { cellNamespace });

        const paper = new dia.Paper({
            model: graph,
            cellViewNamespace: cellNamespace,
            drawGrid: true,
            gridSize: 10,
            ...paperOptions,
        });

        graph.on('add', (cell) => this.onCellAdded(cell));

        const scroller = new ui.PaperScroller({
            autoResizePaper: true,
            baseWidth: 1,
            baseHeight: 1,
            paper,
            borderless: true,
            cursor: 'grab',
            padding: 0,
            inertia: true,
            virtualRendering: true,
            contentOptions: {
                allowNewOrigin: 'any',
                useModelGeometry: true,
                padding: 50,
            }
        });

        scroller.lock();

        this.el.appendChild(scroller.render().el);

        this.paper = paper;
        this.scroller = scroller;
        this.graph = graph;

        if (this.options.toolbar !== false) {
            this.initializeToolbar();
        }
        else {
            this.toolbar = null;
        }

        this.setListeners();

        const { data, target } = this.options;

        if (target) {
            target.appendChild(this.el);
        }
        else {
            throw new Error('PertChart: Missing target element.');
        }

        const { tooltip } = initializeTooltips(this.el);
        this.tooltip = tooltip;

        // Load initial data, if provided.
        if (data) {
            this.update(data);
            this.zoomToFit();
        }

        if (this.options.assignments) {
            this.initializeAssignments();
        }
    }

    initializeAssignments() {
        const { stencil } = initializeAssignments(this.scroller, this.options);
        this.el.appendChild(stencil.el);
        this.resourcesStencil = stencil;
    }

    initializeToolbar() {
        const { toolbar } = initializeToolbar(this.scroller, this.zoomSettings);
        this.el.appendChild(toolbar.el);
        this.toolbar = toolbar;
    }

    showNavigator() {

        this.hideNavigator();

        const { scroller } = this;

        const navigator = new ui.Navigator({
            paperScroller: scroller,
            width: 200,
            height: 150,
            padding: 10,
            zoom: false,
            useContentBBox: { useModelGeometry: true },
            paperOptions: {
                async: true,
                autoFreeze: true,
                elementView: NavigatorElementView,
                viewManagement: true,
                cellVisibility: (cell) => cell.isElement()
            }
        });

        navigator.el.style.position = 'absolute';
        navigator.el.style.right = '10px';
        navigator.el.style.bottom = '10px';

        this.el.appendChild(navigator.render().el);

        this.navigator = navigator;
    }

    hideNavigator() {
        if (!this.navigator)
            return;
        this.navigator.remove();
        this.navigator = null;
    }

    isNavigatorVisible() {
        return !!this.navigator;
    }

    update(data = []) {
        this.graph.syncCells(this.createCells(data));
        this.layoutCells();
        return this;
    }

    zoomToFit() {
        const { scroller } = this;
        scroller.zoomToFit({
            minScale: this.zoomSettings.min,
            maxScale: this.zoomSettings.max,
            scaleGrid: this.zoomSettings.step,
            padding: this.zoomSettings.padding,
            useModelGeometry: true
        });
        return this;
    }

    selectNode(id) {
        const { scroller, paper } = this;
        const highlighterId = 'selection';
        highlighters.stroke.removeAll(paper, highlighterId);
        if (!id)
            return;
        const taskView = paper.findViewByModel(id);
        if (!taskView)
            return;
        const element = taskView.model;
        if (!element.isElement())
            return;
        highlighters.stroke.add(taskView, 'body', highlighterId, {
            layer: dia.Paper.Layers.BACK,
            padding: 10,
            attrs: {
                stroke: taskView.model.get('secondaryColor') || '#000000',
                strokeWidth: 3,
            }
        });
        // Scroll to an element only if it is not completely in the viewport.
        if (!scroller.isElementVisible(element, { strict: true })) {
            scroller.scrollToElement(element, { animation: true });
        }
    }

    addClickEventListener(callback) {
        this.paper.on('element:pointerclick', (elementView, evt) => {
            callback(elementView.model.id, evt);
        });
        this.paper.on('blank:pointerclick', (evt) => {
            callback(null, evt);
        });
    }

    onCellAdded(cell) {
        if (cell.isLink())
            return;
        const elementView = this.paper.findViewByModel(cell);
        AssigneeTags.addToTask(elementView);
        Badges.addToTask(elementView);
    }

    setListeners() {

        const { paper, scroller } = this;

        // Zoom in/out with Ctrl + mouse wheel.
        paper.on('paper:pinch', (evt, ox, oy, scale) => {
            evt.preventDefault();
            scroller.zoom(scale - 1, {
                min: this.zoomSettings.min,
                max: this.zoomSettings.max,
                ox,
                oy
            });
        });

        // Pan the paper when the user drags it.
        paper.on('paper:pan', (evt, tx, ty) => {
            evt.preventDefault();
            scroller.el.scrollLeft += tx;
            scroller.el.scrollTop += ty;
        });

        // Initiate panning when the user grabs the blank area of the paper.
        paper.on('blank:pointerdown', (evt) => {
            scroller.startPanning(evt);
        });

        // Select a task on click and deselect when blank area is clicked.
        paper.on('element:pointerclick', (elementView) => {
            this.selectNode(elementView.model.id);
        });
        paper.on('blank:pointerclick', () => {
            this.selectNode(null);
        });
    }

    createCells(data = []) {
        const tasks = data.map((task) => TaskElement.fromData(task));
        const dependencies = [];
        data.forEach((task) => {
            task.dependencies.forEach((targetTask) => {
                const link = new DependencyLink({
                    id: `link-${task.id}-to-${targetTask}`,
                    source: { id: `${task.id}` },
                    target: { id: `${targetTask}` },
                });
                dependencies.push(link);
            });
        });
        return [...tasks, ...dependencies];
    }

    layoutCells() {
        const { graph } = this;
        return DirectedGraph.layout(graph, {
            rankDir: 'LR',
            setLinkVertices: true,
            nodeSep: 60,
            rankSep: 100,
            edgeSep: 10,
        });
    }

    onRemove() {
        this.paper.remove();
        this.scroller.remove();
        this.tooltip.remove();
        this.toolbar?.remove();
        this.navigator?.remove();
        this.resourcesStencil?.remove();
    }
}
