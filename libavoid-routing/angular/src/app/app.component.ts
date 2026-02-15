import {
    Component,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
} from '@angular/core';
import { dia, shapes } from '@joint/core';
import { Node } from './models/node';
import { Edge } from './models/edge';
// @ts-ignore
import { AvoidRouter } from './shared/avoid-router.js';

const cellNamespace = {
    ...shapes,
    Node,
    Edge,
};

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
    @ViewChild('paperContainer') paperContainer!: ElementRef<HTMLDivElement>;

    private graph!: dia.Graph;
    private paper!: dia.Paper;

    ngAfterViewInit(): void {
        this.initDiagram();
    }

    ngOnDestroy(): void {
        this.paper?.remove();
        this.graph?.clear();
    }

    private async initDiagram(): Promise<void> {
        this.graph = new dia.Graph({}, { cellNamespace });

        this.paper = new dia.Paper({
            el: this.paperContainer.nativeElement,
            model: this.graph,
            cellViewNamespace: cellNamespace,
            width: '100%',
            height: '100%',
            gridSize: 10,
            interactive: { linkMove: false },
            linkPinning: false,
            frozen: true,
            async: true,
            background: { color: '#F3F7F6' },
            snapLinks: { radius: 30 },
            defaultConnector: {
                name: 'straight',
                args: {
                    cornerType: 'cubic',
                    cornerRadius: 4,
                },
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
                end: 'source' | 'target'
            ) => {
                const source = sourceView.model;
                const target = targetView.model;
                if (source.isLink() || target.isLink()) return false;
                if (targetMagnet === sourceMagnet) return false;
                if (end === 'target' ? targetMagnet : sourceMagnet) {
                    return true;
                }
                if (source === target) return false;
                return end === 'target'
                    ? !(target as dia.Element).hasPorts()
                    : !(source as dia.Element).hasPorts();
            },
        });

        this.createSampleDiagram();
        await this.initRouter();

        this.paper.unfreeze();
        this.paper.fitToContent({
            useModelGeometry: true,
            padding: 50,
            allowNewOrigin: 'any',
        });
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
