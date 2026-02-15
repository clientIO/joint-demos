import {
    Component,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
} from '@angular/core';
import { dia, shapes, ui, format, util, highlighters } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { Node, GRID_SIZE } from './models/node';
import { Edge } from './models/edge';


const cellNamespace = {
    ...shapes,
    Node,
    Edge,
};

const SELECTION_ID = 'selection';

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

    ngAfterViewInit(): void {
        this.initDiagram();
    }

    ngOnDestroy(): void {
        this.routerWorker?.terminate();
        this.commandManager?.clear();
        this.toolbar?.remove();
        this.navigator?.remove();
        this.scroller?.remove();
        this.paper?.remove();
        this.graph?.clear();
    }

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

        this.paper.on('blank:pointerdown', (evt: dia.Event) => {
            this.deselectAll();
            this.scroller.startPanning(evt);
        });

        this.paper.on('element:pointerclick', (elementView: dia.ElementView) => {
            this.select(elementView);
        });

        this.paper.on('link:pointerclick', (linkView: dia.LinkView) => {
            this.select(linkView);
        });

        this.paper.on('link:connect', (linkView: dia.LinkView) => {
            this.select(linkView);
        });

        this.paper.on('paper:pinch', (evt: dia.Event, ox: number, oy: number, scale: number) => {
            evt.preventDefault();
            this.scroller.zoom(scale - 1, { min: 0.2, max: 5, ox, oy });
        });

        this.paper.on('paper:pan', (evt: dia.Event, tx: number, ty: number) => {
            evt.preventDefault();
            this.scroller.el.scrollLeft += tx;
            this.scroller.el.scrollTop += ty;
        });

        this.navigator = new ui.Navigator({
            paperScroller: this.scroller,
            width: 200,
            height: 150,
            useContentBBox: { useModelGeometry: true },
            paperOptions: {
                elementView: NavigatorElementView,
                defaultAnchor: {
                    name: 'center',
                    args: {
                        useModelGeometry: true,
                    }
                },
                defaultRouter: {
                    name: 'rightAngle',
                }
            },
        });

        this.navigatorContainer.nativeElement.appendChild(this.navigator.el);
        this.navigator.render();

        this.initToolbar();

        this.createSampleDiagram();
        this.initRouter();

        this.paper.unfreeze();
        this.scroller.centerContent({ useModelGeometry: true });
    }

    private initToolbar(): void {
        this.toolbar = new ui.Toolbar({
            autoToggle: true,
            references: {
                paperScroller: this.scroller,
                commandManager: this.commandManager,
            },
            tools: [
                { type: 'undo' },
                { type: 'redo' },
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

        this.toolbar.on('png:pointerclick', () => {
            format.toPNG(this.paper, (dataUri: string) => {
                util.downloadDataUri(dataUri, 'diagram.png');
            }, { padding: 10, useComputedStyles: false });
        });

        this.toolbar.on('svg:pointerclick', () => {
            format.toSVG(this.paper, (svgString: string) => {
                const dataUri = 'data:image/svg+xml,' + encodeURIComponent(svgString);
                util.downloadDataUri(dataUri, 'diagram.svg');
            }, { useComputedStyles: false });
        });

        this.toolbar.on('json:pointerclick', () => {
            const jsonString = JSON.stringify(this.graph.toJSON());
            const blob = new Blob([jsonString], { type: 'application/json' });
            util.downloadBlob(blob, 'diagram.json');
        });

        this.toolbar.on('layout:pointerclick', () => {
            DirectedGraph.layout(this.graph, {
                rankDir: 'LR',
                rankSep: 120,
                nodeSep: 30,
                setVertices: false
            });
            this.scroller.centerContent({ useModelGeometry: true });
        });
    }

    private select(cellView: dia.CellView): void {
        this.deselectAll();
        highlighters.addClass.add(cellView, 'root', SELECTION_ID, {
            className: 'selected',
        });
    }

    private deselectAll(): void {
        highlighters.addClass.removeAll(this.paper, SELECTION_ID);
    }

    private createSampleDiagram(): void {
        const W = 260;

        // Column 1 (x~50): Data Sources
        const database = new Node({
            position: { x: 50, y: 50 },
            size: { width: W, height: Node.getHeight(0, 3) },
            attrs: { label: { text: 'Database' } },
            ports: {
                items: [
                    { group: 'right', id: 'users', attrs: { label: { text: 'users' } } },
                    { group: 'right', id: 'orders', attrs: { label: { text: 'orders' } } },
                    { group: 'right', id: 'products', attrs: { label: { text: 'products' } } },
                ],
            },
        });

        const apiGateway = new Node({
            position: { x: 50, y: 290 },
            size: { width: W, height: Node.getHeight(0, 2) },
            attrs: { label: { text: 'API Gateway' } },
            ports: {
                items: [
                    { group: 'right', id: 'requests', attrs: { label: { text: 'requests' } } },
                    { group: 'right', id: 'sessions', attrs: { label: { text: 'sessions' } } },
                ],
            },
        });

        // Column 2 (x~450): Processing
        const transform = new Node({
            position: { x: 450, y: 50 },
            size: { width: W, height: Node.getHeight(3, 4) },
            attrs: { label: { text: 'Transform' } },
            ports: {
                items: [
                    { group: 'left', id: 'raw_users', attrs: { label: { text: 'raw users' } } },
                    { group: 'left', id: 'raw_orders', attrs: { label: { text: 'raw orders' } } },
                    { group: 'left', id: 'raw_requests', attrs: { label: { text: 'raw requests' } } },
                    { group: 'right', id: 'clean_users', attrs: { label: { text: 'clean users' } } },
                    { group: 'right', id: 'clean_orders', attrs: { label: { text: 'clean orders' } } },
                    { group: 'right', id: 'user_activity', attrs: { label: { text: 'user activity' } } },
                    { group: 'right', id: 'error_log', attrs: { label: { text: 'error log' } } },
                ],
            },
        });

        const enrich = new Node({
            position: { x: 450, y: 300 },
            size: { width: W, height: Node.getHeight(2, 2) },
            attrs: { label: { text: 'Enrich' } },
            ports: {
                items: [
                    { group: 'left', id: 'products', attrs: { label: { text: 'products' } } },
                    { group: 'left', id: 'sessions', attrs: { label: { text: 'sessions' } } },
                    { group: 'right', id: 'catalog', attrs: { label: { text: 'catalog' } } },
                    { group: 'right', id: 'user_sessions', attrs: { label: { text: 'user sessions' } } },
                ],
            },
        });

        // Column 3 (x~850): Analytics
        const aggregate = new Node({
            position: { x: 850, y: 50 },
            size: { width: W, height: Node.getHeight(5, 3) },
            attrs: { label: { text: 'Aggregate' } },
            ports: {
                items: [
                    { group: 'left', id: 'clean_users', attrs: { label: { text: 'clean users' } } },
                    { group: 'left', id: 'clean_orders', attrs: { label: { text: 'clean orders' } } },
                    { group: 'left', id: 'user_activity', attrs: { label: { text: 'user activity' } } },
                    { group: 'left', id: 'catalog', attrs: { label: { text: 'catalog' } } },
                    { group: 'left', id: 'user_sessions', attrs: { label: { text: 'user sessions' } } },
                    { group: 'right', id: 'revenue', attrs: { label: { text: 'revenue' } } },
                    { group: 'right', id: 'engagement', attrs: { label: { text: 'engagement' } } },
                    { group: 'right', id: 'conversion', attrs: { label: { text: 'conversion' } } },
                ],
            },
        });

        const monitor = new Node({
            position: { x: 850, y: 320 },
            size: { width: W, height: Node.getHeight(1, 1) },
            attrs: { label: { text: 'Monitor' } },
            ports: {
                items: [
                    { group: 'left', id: 'error_log', attrs: { label: { text: 'error log' } } },
                    { group: 'right', id: 'alerts', attrs: { label: { text: 'alerts' } } },
                ],
            },
        });

        // Column 4 (x~1250): Output
        const dashboard = new Node({
            position: { x: 1250, y: 50 },
            size: { width: W, height: Node.getHeight(4, 0) },
            attrs: { label: { text: 'Dashboard' } },
            ports: {
                items: [
                    { group: 'left', id: 'revenue', attrs: { label: { text: 'revenue' } } },
                    { group: 'left', id: 'engagement', attrs: { label: { text: 'engagement' } } },
                    { group: 'left', id: 'conversion', attrs: { label: { text: 'conversion' } } },
                    { group: 'left', id: 'alerts', attrs: { label: { text: 'alerts' } } },
                ],
            },
        });

        // Links: right ports → left ports across columns
        const links = [
            // Database → Transform
            new Edge({ source: { id: database.id, port: 'users' }, target: { id: transform.id, port: 'raw_users' } }),
            new Edge({ source: { id: database.id, port: 'orders' }, target: { id: transform.id, port: 'raw_orders' } }),
            new Edge({ source: { id: database.id, port: 'products' }, target: { id: enrich.id, port: 'products' } }),
            // API Gateway → Transform / Enrich
            new Edge({ source: { id: apiGateway.id, port: 'requests' }, target: { id: transform.id, port: 'raw_requests' } }),
            new Edge({ source: { id: apiGateway.id, port: 'sessions' }, target: { id: enrich.id, port: 'sessions' } }),
            // Transform → Aggregate / Monitor
            new Edge({ source: { id: transform.id, port: 'clean_users' }, target: { id: aggregate.id, port: 'clean_users' } }),
            new Edge({ source: { id: transform.id, port: 'clean_orders' }, target: { id: aggregate.id, port: 'clean_orders' } }),
            new Edge({ source: { id: transform.id, port: 'user_activity' }, target: { id: aggregate.id, port: 'user_activity' } }),
            new Edge({ source: { id: transform.id, port: 'error_log' }, target: { id: monitor.id, port: 'error_log' } }),
            // Enrich → Aggregate
            new Edge({ source: { id: enrich.id, port: 'catalog' }, target: { id: aggregate.id, port: 'catalog' } }),
            new Edge({ source: { id: enrich.id, port: 'user_sessions' }, target: { id: aggregate.id, port: 'user_sessions' } }),
            // Aggregate → Dashboard
            new Edge({ source: { id: aggregate.id, port: 'revenue' }, target: { id: dashboard.id, port: 'revenue' } }),
            new Edge({ source: { id: aggregate.id, port: 'engagement' }, target: { id: dashboard.id, port: 'engagement' } }),
            new Edge({ source: { id: aggregate.id, port: 'conversion' }, target: { id: dashboard.id, port: 'conversion' } }),
            // Monitor → Dashboard
            new Edge({ source: { id: monitor.id, port: 'alerts' }, target: { id: dashboard.id, port: 'alerts' } }),
        ];

        this.graph.resetCells([database, apiGateway, transform, enrich, aggregate, monitor, dashboard, ...links]);
    }

    private initRouter(): void {
        const AWAITING_ID = 'awaiting-update';

        this.routerWorker = new Worker(
            new URL('./shared/avoid-router.worker.js', import.meta.url)
        );

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
        this.graph.on('change', (cell: dia.Cell, opt: any) => {
            if (opt.fromWorker) return;
            this.routerWorker.postMessage([{
                command: 'change',
                cell: cell.toJSON(),
            }]);
            // Show awaiting-update on connected links while worker routes
            if (cell.isElement() && (cell.hasChanged('position') || cell.hasChanged('size'))) {
                this.graph.getConnectedLinks(cell).forEach((link) => {
                    link.router() || link.router('rightAngle', {}, { skipHistory: true });
                    const linkView = link.findView(this.paper);
                    if (linkView) {
                        highlighters.addClass.add(linkView, 'root', AWAITING_ID, {
                            className: 'awaiting-update',
                        });
                    }
                });
            }
        });

        this.graph.on('remove', (cell: dia.Cell) => {
            this.routerWorker.postMessage([{
                command: 'remove',
                id: cell.id,
            }]);
        });

        this.graph.on('add', (cell: dia.Cell) => {
            this.routerWorker.postMessage([{
                command: 'add',
                cell: cell.toJSON(),
            }]);
        });

        // Apply temporary rightAngle router during link snapping
        this.paper.on('link:snap:connect', (linkView: dia.LinkView) => {
            linkView.model.router('rightAngle', {},  { skipHistory: true });
        });

        this.paper.on('link:snap:disconnect', (linkView: dia.LinkView) => {
            linkView.model.set({ vertices: [], router: null }, { skipHistory: true });
        });
    }
}
