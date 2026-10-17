import { Edge, HdlNode } from '../diagram/models';
import { Attribute } from '../diagram/const';
import { getLinkRoute } from '../diagram/data/manipulation';

import type { dia } from '@joint/plus';
import type { App } from '../app';

/**
 * Points closer than this are considered equal.
 */
const EPSILON = 0.5;

/**
 * Updates the width of all wires based on the widths of the connected ports.
 */
export function updateWires(app: App) {
    const { graph } = app;

    graph.getLinks().forEach((link) => {
        if (!(link instanceof Edge)) return;
        const source = link.getSourceElement();
        const target = link.getTargetElement();
        if (!(source instanceof HdlNode) || !(target instanceof HdlNode)) return;
        const sourceWidth = source.getPortWidth(link.source().port as string);
        const targetWidth = target.getPortWidth(link.target().port as string);
        link.setBusWidth(sourceWidth, sourceWidth !== targetWidth);
    });
}

/**
 * Updates the decorations depending on the wire routes:
 * - the junction points where the wires of a net split,
 * - the position of the bus width label (one per net).
 */
export function updateWireGeometry(app: App) {
    getNets(app).forEach((edges) => {
        const routes = edges.map(edge => getLinkRoute(edge).points);
        const junctions = getJunctionPoints(routes);
        edges.forEach((edge, index) => {
            // The first wire of the net draws the decorations of the whole net
            const isFirst = index === 0;
            edge.set(Attribute.JunctionPoints, isFirst ? junctions : []);
            edge.updateBusLabelPosition(isFirst ? routes[index] : null);
        });
    });
}

/**
 * Get all wires driven by the same output port as the given wire (the net).
 */
export function getNetEdges(app: App, edge: Edge): Edge[] {
    const { graph } = app;

    const source = edge.getSourceElement();
    if (!source) return [edge];
    const portId = edge.source().port;
    return graph.getConnectedLinks(source, { outbound: true }).filter(link => {
        return link instanceof Edge && link.source().port === portId;
    }) as Edge[];
}

/**
 * Group the wires by their source port (the nets).
 */
function getNets(app: App): Edge[][] {
    const { graph } = app;

    const nets = new Map<string, Edge[]>();
    graph.getLinks().forEach((link) => {
        if (!(link instanceof Edge)) return;
        const { id, port } = link.source();
        if (!id || !link.getTargetElement()) return;
        const key = `${id}/${port}`;
        if (!nets.has(key)) nets.set(key, []);
        nets.get(key)!.push(link);
    });
    return Array.from(nets.values());
}

/**
 * Find the junction points of a net: the points where 3 or more wire segments of the net meet
 * (e.g. a wire branching off another one). The routes are orthogonal polylines.
 */
function getJunctionPoints(routes: dia.Point[][]): dia.Point[] {
    const segments: Array<[dia.Point, dia.Point]> = [];
    routes.forEach((route) => {
        for (let i = 1; i < route.length; i++) {
            if (getDistance(route[i - 1], route[i]) < EPSILON) continue;
            segments.push([route[i - 1], route[i]]);
        }
    });
    // The candidates are the vertices of the routes (a branch always starts at a bend
    // of one of the wires, or at the end of a segment)
    const candidates: dia.Point[] = [];
    routes.forEach(route => route.forEach((point) => {
        if (!candidates.some(candidate => isSamePoint(candidate, point))) {
            candidates.push(point);
        }
    }));
    return candidates.filter(point => countDirections(point, segments) >= 3);
}

/**
 * Count the distinct directions (up, down, left, right) of the wire segments leaving the point.
 */
function countDirections(point: dia.Point, segments: Array<[dia.Point, dia.Point]>): number {
    const directions = new Set<string>();
    const addDirection = (to: dia.Point) => {
        const { x, y } = getDirection(point, to);
        directions.add(`${x},${y}`);
    };
    segments.forEach(([a, b]) => {
        if (isSamePoint(point, a)) {
            addDirection(b);
        } else if (isSamePoint(point, b)) {
            addDirection(a);
        } else if (isOnSegment(point, a, b)) {
            // The segment passes through the point
            addDirection(a);
            addDirection(b);
        }
    });
    return directions.size;
}

/**
 * Is the point inside the (orthogonal) segment?
 */
function isOnSegment(point: dia.Point, a: dia.Point, b: dia.Point): boolean {
    if (Math.abs(a.x - b.x) < EPSILON) {
        // Vertical segment
        return Math.abs(point.x - a.x) < EPSILON && point.y > Math.min(a.y, b.y) && point.y < Math.max(a.y, b.y);
    }
    if (Math.abs(a.y - b.y) < EPSILON) {
        // Horizontal segment
        return Math.abs(point.y - a.y) < EPSILON && point.x > Math.min(a.x, b.x) && point.x < Math.max(a.x, b.x);
    }
    return false;
}

function getDirection(from: dia.Point, to: dia.Point): dia.Point {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return {
        x: Math.abs(dx) < EPSILON ? 0 : Math.sign(dx),
        y: Math.abs(dy) < EPSILON ? 0 : Math.sign(dy)
    };
}

function getDistance(from: dia.Point, to: dia.Point): number {
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
}

function isSamePoint(a: dia.Point, b: dia.Point): boolean {
    return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}
