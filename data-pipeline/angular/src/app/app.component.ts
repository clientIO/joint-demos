import {
    Component,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
} from '@angular/core';
import { dia, shapes, ui, format, util, highlighters } from '@joint/plus';
import { Node } from './models/node';
import { Edge } from './models/edge';
// @ts-ignore
import { AvoidRouter } from './shared/avoid-router.js';

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


    ngAfterViewInit(): void {
        this.initDiagram();
    }

    ngOnDestroy(): void {
        this.toolbar?.remove();
        this.navigator?.remove();
        this.scroller?.remove();
        this.paper?.remove();
        this.graph?.clear();
    }

    private async initDiagram(): Promise<void> {
        this.graph = new dia.Graph({}, { cellNamespace });

        this.paper = new dia.Paper({
            model: this.graph,
            cellViewNamespace: cellNamespace,
            gridSize: 10,
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
                name: 'anchor',
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
            paperOptions: {
                elementView: NavigatorElementView,
            },
        });

        this.navigatorContainer.nativeElement.appendChild(this.navigator.el);
        this.navigator.render();

        this.initToolbar();

        this.createSampleDiagram();
        await this.initRouter();

        this.paper.unfreeze();
        this.scroller.centerContent({ useModelGeometry: true });
    }

    private initToolbar(): void {
        this.toolbar = new ui.Toolbar({
            autoToggle: true,
            references: {
                paperScroller: this.scroller,
            },
            tools: [
                { type: 'zoom-slider', min: 20, max: 500 },
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
            position: { x: 50, y: 250 },
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
            position: { x: 450, y: 30 },
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
            position: { x: 450, y: 280 },
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
            position: { x: 850, y: 20 },
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

        this.graph.addCells([database, apiGateway, transform, enrich, aggregate, monitor, dashboard, ...links]);
    }

    private async initRouter(): Promise<void> {
        await AvoidRouter.load();

        const router = new AvoidRouter(this.graph, {
            shapeBufferDistance: 20,
            idealNudgingDistance: 10,
            portOverflow: Node.PORT_RADIUS,
        });

        router.addGraphListeners();
        router.routeAll();
    }
}
