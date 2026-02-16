import {
    Component,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
} from '@angular/core';
import { dia, mvc, shapes, ui, format, util, highlighters } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { Node, GRID_SIZE } from './models/node';
import { Edge } from './models/edge';
import { createSampleDiagram } from './sample-diagram';


/** Cell namespace mapping type strings to shape constructors for graph deserialization. */
const cellNamespace = {
    ...shapes,
    Node,
    Edge,
};

/** Highlighter ID used for tracking the selected cell. */
const SELECTION_ID = 'selection';

/** Shared options passed to PNG/SVG export functions. */
const EXPORT_OPTIONS = { useComputedStyles: false };

/**
 * Lightweight element view used inside the {@link ui.Navigator} minimap.
 * Renders a simple colored rectangle instead of the full node markup,
 * which keeps the minimap fast regardless of graph complexity.
 */
const NavigatorElementView = dia.ElementView.extend({
    body: null,
    markup: util.svg/* xml */`
        <rect @selector="body" />
    `,
    initFlag: [dia.ElementView.Flags.RENDER],
    presentationAttributes: {
        position: [dia.ElementView.Flags.TRANSLATE],
        size: [dia.ElementView.Flags.RESIZE],
    },
    render() {
        const doc = this.parseDOMJSON(this.markup);
        this.body = doc.selectors.body;
        this.el.appendChild(doc.fragment);
        return this;
    },
    confirmUpdate(flags: number) {
        if (this.hasFlag(flags, dia.ElementView.Flags.RENDER)) {
            this.render();
            const { width, height } = this.model.size();
            this.body.setAttribute('fill', '#f0f4ff');
            this.body.setAttribute('stroke', '#4665E5');
            this.body.setAttribute('stroke-width', '1');
            this.body.setAttribute('rx', '4');
            this.body.setAttribute('ry', '4');
            this.body.setAttribute('width', width);
            this.body.setAttribute('height', height);
            this.translate();
        }
        if (this.hasFlag(flags, dia.ElementView.Flags.RESIZE)) {
            const { width, height } = this.model.size();
            this.body.setAttribute('width', width);
            this.body.setAttribute('height', height);
        }
        if (this.hasFlag(flags, dia.ElementView.Flags.TRANSLATE)) {
            this.translate();
        }
    },
    translate() {
        const { x, y } = this.model.position();
        this.el.setAttribute('transform', `translate(${x},${y})`);
    },
});

/**
 * Root component that sets up the JointJS data-pipeline diagram.
 *
 * ## Architecture
 *
 * The diagram uses a Web Worker for link routing so the libavoid WASM
 * computation never blocks the UI thread. The main thread and the worker
 * each maintain their own {@link dia.Graph} instance, kept in sync via
 * a simple message protocol:
 *
 * ### Worker communication protocol
 *
 * **Main thread → Worker** (commands sent via `postMessage`):
 *
 * | Command    | Payload                 | Description                                      |
 * |------------|-------------------------|--------------------------------------------------|
 * | `reset`    | `{ cells: CellJSON[] }` | Send the full graph; worker replaces its state    |
 * | `change`   | `{ cell: CellJSON }`    | An element moved/resized or a link reconnected    |
 * | `add`      | `{ cell: CellJSON }`    | A new cell was added to the graph                 |
 * | `remove`   | `{ id: string }`        | A cell was removed from the graph                 |
 *
 * **Worker → Main thread** (responses received via `onmessage`):
 *
 * | Command    | Payload                 | Description                                      |
 * |------------|-------------------------|--------------------------------------------------|
 * | `routed`   | `{ cells: CellJSON[] }` | Updated link vertices/source/target after routing |
 *
 * While the worker is computing, affected links display a visual
 * "awaiting-update" state (reduced opacity). Once the `routed` response
 * arrives the vertices are applied and the visual indicator is removed.
 *
 * Changes originating from the worker carry `{ fromWorker: true }` and
 * are excluded from the {@link dia.CommandManager} undo/redo history.
 */
@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
    @ViewChild('scrollerContainer') scrollerContainer!: ElementRef<HTMLDivElement>;
    @ViewChild('navigatorContainer') navigatorContainer!: ElementRef<HTMLDivElement>;
    @ViewChild('toolbarContainer') toolbarContainer!: ElementRef<HTMLDivElement>;

    private graph!: dia.Graph;
    private paper!: dia.Paper;
    private scroller!: ui.PaperScroller;
    private navigator!: ui.Navigator;
    private toolbar!: ui.Toolbar;
    private commandManager!: dia.CommandManager;
    private routerWorker!: Worker;
    private controller = new mvc.Listener();

    ngAfterViewInit(): void {
        this.initDiagram();
    }

    ngOnDestroy(): void {
        this.controller.stopListening();
        this.routerWorker?.terminate();
        this.toolbar?.remove();
        this.navigator?.remove();
        this.scroller?.remove();
        this.paper?.remove();
    }

    /**
     * Initializes the full diagram: graph, command manager, paper,
     * paper scroller, navigator, toolbar, sample data, and router worker.
     * Called once from {@link ngAfterViewInit}.
     */
    private initDiagram(): void {
        this.graph = new dia.Graph({}, { cellNamespace });

        this.commandManager = new dia.CommandManager({
            graph: this.graph,
            revertOptionsList: ['fromWorker'],
            cmdBeforeAdd: (_cmdName, _cell, _value, opt = {}) => {
                // Prevent adding undo steps for changes coming from the router worker
                // or temporary routing changes
                return !opt.fromWorker && !opt.skipHistory;
            }
        });

        this.paper = new dia.Paper({
            model: this.graph,
            cellViewNamespace: cellNamespace,
            gridSize: GRID_SIZE,
            interactive: { linkMove: false },
            linkPinning: false,
            frozen: true,
            async: true,
            clickThreshold: 10,
            background: { color: '#F3F7F6' },
            snapLinks: { radius: 30 },
            defaultConnector: {
                name: 'straight',
                args: {
                    cornerType: 'cubic',
                    cornerRadius: 4,
                    cornerPreserveAspectRatio: true,
                },
            },
            defaultConnectionPoint: {
                name: 'rectangle',
                args: {
                    useModelGeometry: true,
                }
            },
            highlighting: {
                default: {
                    name: 'mask',
                    options: {
                        padding: 2,
                        attrs: {
                            stroke: '#EA3C24',
                            strokeWidth: 2,
                        },
                    },
                },
            },
            defaultLink: () => new Edge(),
            validateConnection: (
                sourceView: dia.CellView,
                sourceMagnet: SVGElement | null,
                targetView: dia.CellView,
                targetMagnet: SVGElement | null,
                end: 'source' | 'target',
                linkView: dia.LinkView
            ) => {
                const source = sourceView.model;
                const target = targetView.model;
                if (source.isLink() || target.isLink()) return false;
                if (targetMagnet === sourceMagnet) return false;
                if (end === 'target' ? targetMagnet : sourceMagnet) {
                    const sourcePort = sourceMagnet?.getAttribute('port');
                    const targetPort = targetMagnet?.getAttribute('port');
                    // Reject connections to output (right) ports
                    if (targetPort) {
                        const targetPortGroup = (target as dia.Element).getPort(targetPort)?.group;
                        if (targetPortGroup === 'right') return false;
                    }
                    if (sourcePort && targetPort) {
                        const duplicate = this.graph.getLinks().some((link) => {
                            if (link === linkView.model) return false;
                            const s = link.source();
                            const t = link.target();
                            return s.id === source.id && s.port === sourcePort
                                && t.id === target.id && t.port === targetPort;
                        });
                        if (duplicate) return false;
                    }
                    return true;
                }
                if (source === target) return false;
                return end === 'target'
                    ? !(target as dia.Element).hasPorts()
                    : !(source as dia.Element).hasPorts();
            },
        });

        this.scroller = new ui.PaperScroller({
            paper: this.paper,
            autoResizePaper: true,
            contentOptions: {
                useModelGeometry: true,
                padding: 100,
                allowNewOrigin: 'any',
            },
            cursor: 'grab',
        });

        this.scrollerContainer.nativeElement.appendChild(this.scroller.el);
        this.scroller.render();

        this.controller.listenTo(this.paper, {
            'blank:pointerdown': (evt: dia.Event) => {
                this.deselectAll();
                this.scroller.startPanning(evt);
            },
            'element:pointerclick': (elementView: dia.ElementView) => {
                this.select(elementView);
            },
            'link:pointerclick': (linkView: dia.LinkView) => {
                this.select(linkView);
            },
            'link:connect': (linkView: dia.LinkView) => {
                this.select(linkView);
            },
            'paper:pinch': (evt: dia.Event, ox: number, oy: number, scale: number) => {
                evt.preventDefault();
                this.scroller.zoom(scale - 1, { min: 0.2, max: 5, ox, oy });
            },
            'paper:pan': (evt: dia.Event, tx: number, ty: number) => {
                evt.preventDefault();
                this.scroller.el.scrollLeft += tx;
                this.scroller.el.scrollTop += ty;
            },
        });

        this.navigator = new ui.Navigator({
            paperScroller: this.scroller,
            width: 200,
            height: 150,
            useContentBBox: { useModelGeometry: true },
            dynamicZoom: true,
            paperOptions: {
                overflow: true,
                elementView: NavigatorElementView,
                defaultAnchor: {
                    name: 'center',
                    args: {
                        useModelGeometry: true,
                    }
                },
            },
        });

        this.navigatorContainer.nativeElement.appendChild(this.navigator.el);
        this.navigator.render();
        this.navigator.targetPaper.svg.style.shapeRendering = 'crispEdges';

        this.initToolbar();

        createSampleDiagram(this.graph);
        this.initRouter();

        this.paper.unfreeze();
        this.scroller.centerContent({ useModelGeometry: true });
    }

    /**
     * Creates the toolbar with undo/redo, zoom, auto-layout, and export buttons.
     * Export handlers convert the current diagram to PNG, SVG, or JSON and
     * trigger a browser download.
     */
    private initToolbar(): void {
        this.toolbar = new ui.Toolbar({
            autoToggle: true,
            references: {
                paperScroller: this.scroller,
                commandManager: this.commandManager,
            },
            tools: [
                { type: 'undo', text: 'Undo' },
                { type: 'redo', text: 'Redo' },
                { type: 'separator' },
                { type: 'zoom-slider', min: 20, max: 500 },
                { type: 'separator' },
                { type: 'button', name: 'layout', text: 'Auto Layout' },
                { type: 'separator' },
                { type: 'button', name: 'png', text: 'Export PNG' },
                { type: 'button', name: 'svg', text: 'Export SVG' },
                { type: 'button', name: 'json', text: 'Export JSON' },
            ],
        });

        this.toolbarContainer.nativeElement.appendChild(this.toolbar.el);
        this.toolbar.render();

        this.controller.listenTo(this.toolbar, {
            'png:pointerclick': () => {
                format.toPNG(this.paper, (dataUri: string) => {
                    util.downloadDataUri(dataUri, 'diagram.png');
                }, { ...EXPORT_OPTIONS, padding: 10 });
            },
            'svg:pointerclick': () => {
                format.toSVG(this.paper, (svgString: string) => {
                    const dataUri = 'data:image/svg+xml,' + encodeURIComponent(svgString);
                    util.downloadDataUri(dataUri, 'diagram.svg');
                }, EXPORT_OPTIONS);
            },
            'json:pointerclick': () => {
                const jsonString = JSON.stringify(this.graph.toJSON());
                const blob = new Blob([jsonString], { type: 'application/json' });
                util.downloadBlob(blob, 'diagram.json');
            },
            'layout:pointerclick': () => {
                DirectedGraph.layout(this.graph, {
                    rankDir: 'LR',
                    rankSep: 120,
                    nodeSep: 30,
                    setVertices: false
                });
                this.scroller.centerContent({ useModelGeometry: true });
            },
        });
    }

    /** Selects a cell by applying the `selected` CSS class via a highlighter. */
    private select(cellView: dia.CellView): void {
        this.deselectAll();
        highlighters.addClass.add(cellView, 'root', SELECTION_ID, {
            className: 'selected',
        });
    }

    /** Removes the selection highlighter from all cells on the paper. */
    private deselectAll(): void {
        highlighters.addClass.removeAll(this.paper, SELECTION_ID);
    }

    /**
     * Starts the libavoid routing Web Worker and wires up the bidirectional
     * communication between the main-thread graph and the worker graph.
     *
     * On startup, sends a `reset` command with all cells so the worker
     * builds its internal obstacle map. Then listens for graph `change`,
     * `add`, and `remove` events to keep the worker in sync.
     *
     * While the worker computes routes, connected links are given a
     * temporary `rightAngle` router as a visual placeholder and marked
     * with an "awaiting-update" highlighter. When the worker responds
     * with a `routed` message, the computed vertices replace the
     * placeholder and the highlighter is removed.
     */
    private initRouter(): void {
        const AWAITING_ID = 'awaiting-update';

        this.routerWorker = new Worker(
            new URL('./routing/avoid-router.worker.js', import.meta.url)
        );

        this.routerWorker.onerror = (error) => {
            console.error('Router worker error:', error);
        };

        // Receive routed cells from the worker
        this.routerWorker.onmessage = (e: MessageEvent) => {
            const { command, ...data } = e.data;
            if (command === 'routed') {
                const { cells } = data;
                cells.forEach((cell: any) => {
                    const model = this.graph.getCell(cell.id);
                    if (!model || model.isElement()) return;
                    model.set({
                        vertices: cell.vertices,
                        source: cell.source,
                        target: cell.target,
                        router: null,
                    }, { fromWorker: true });
                });
                highlighters.addClass.removeAll(this.paper, AWAITING_ID);
            }
        };

        // Send initial graph state
        this.routerWorker.postMessage([{
            command: 'reset',
            cells: this.graph.toJSON().cells,
        }]);

        // Mark all links as awaiting worker routing on startup
        this.graph.getLinks().forEach((link) => {
            const linkView = link.findView(this.paper);
            if (linkView) {
                highlighters.addClass.add(linkView, 'root', AWAITING_ID, {
                    className: 'awaiting-update',
                });
            }
        });

        // Forward graph changes to the worker
        this.controller.listenTo(this.graph, {
            'change': (cell: dia.Cell, opt: any) => {
                if (opt.fromWorker) return;
                this.routerWorker.postMessage([{
                    command: 'change',
                    cell: cell.toJSON(),
                }]);
                // Show awaiting-update on connected links while worker routes
                if (cell.isElement() && (cell.hasChanged('position') || cell.hasChanged('size'))) {
                    this.graph.getConnectedLinks(cell).forEach((link) => {
                        if (!link.router()) {
                            link.router('rightAngle', {}, { skipHistory: true });
                        }
                        const linkView = link.findView(this.paper);
                        if (linkView) {
                            highlighters.addClass.add(linkView, 'root', AWAITING_ID, {
                                className: 'awaiting-update',
                            });
                        }
                    });
                }
            },
            'remove': (cell: dia.Cell) => {
                this.routerWorker.postMessage([{
                    command: 'remove',
                    id: cell.id,
                }]);
            },
            'add': (cell: dia.Cell) => {
                this.routerWorker.postMessage([{
                    command: 'add',
                    cell: cell.toJSON(),
                }]);
            },
        });

        // Apply temporary rightAngle router during link snapping
        this.controller.listenTo(this.paper, {
            'link:snap:connect': (linkView: dia.LinkView) => {
                linkView.model.router('rightAngle', {}, { skipHistory: true });
            },
            'link:snap:disconnect': (linkView: dia.LinkView) => {
                linkView.model.set({ vertices: [], router: null }, { skipHistory: true });
            },
        });
    }
}
