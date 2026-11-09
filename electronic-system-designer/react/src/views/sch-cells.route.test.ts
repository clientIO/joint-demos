// Derived wire records: native port ends, plus the router's remembered route.

import { describe, expect, it } from 'vitest';
import type { Design } from '@/model/design';
import { INITIAL_DESIGN } from '@/model/initial-design';
import { clearRouterRoutes, rememberRouterRoute, routeSignature } from './router-routes';
import { PORT_MAGNET_SELECTOR } from '@/symbols/port-markup';
import { deriveSchCells } from './sch-cells';

const BENDS = [{ x: 10, y: 20 }];
const first = INITIAL_DESIGN.wires[0];

function wireRecord(design: Design) {
    const cell = deriveSchCells(design).find((candidate) => candidate.id === first.id);
    if (cell === undefined || cell.type !== 'link') throw new Error('wire record missing');
    return cell;
}

/** The signature of the first wire's geometry in `design`. */
function firstAt(design: Design): string {
    const position = (id: string) => design.components.find((component) => component.id === id)?.position ?? { x: NaN, y: NaN };
    return routeSignature(
        { id: first.from.component, position: position(first.from.component), pin: first.from.pin },
        { id: first.to.component, position: position(first.to.component), pin: first.to.pin },
    );
}

const anchors = { from: { name: 'modelCenter', args: { dx: 4, dy: 0 }}, to: { name: 'modelCenter' }};

describe('wire records', () => {
    it('draws an unrouted wire nothing until libavoid routes it, ends on native ports', () => {
        const record = wireRecord(INITIAL_DESIGN);
        expect(record.router).toEqual({ name: 'normal' });
        expect(record.data).toEqual({ kind: 'wire', wireId: first.id, unrouted: true });
        expect(record.source).toEqual({ id: first.from.component, port: first.from.pin, magnet: PORT_MAGNET_SELECTOR, anchor: { name: 'modelCenter' }});
    });
});

describe('router routes on derived records', () => {
    it('repeats the router\'s last anchors and bends, so a re-sync or remount changes nothing', () => {
        rememberRouterRoute(first.id, { at: firstAt(INITIAL_DESIGN), ...anchors, vertices: BENDS });
        const record = wireRecord(INITIAL_DESIGN);
        clearRouterRoutes();
        expect(record.data).toEqual({ kind: 'wire', wireId: first.id });
        expect(record.source).toEqual({ id: first.from.component, port: first.from.pin, magnet: PORT_MAGNET_SELECTOR, anchor: anchors.from });
        expect(record.target).toEqual({ id: first.to.component, port: first.to.pin, magnet: PORT_MAGNET_SELECTOR, anchor: anchors.to });
        expect(record.vertices).toEqual(BENDS);
    });

    // Regression: a route computed before an off-sheet edit (undo on another
    // tab, a fix) was replayed onto parts that had moved, drawing stale bends.
    it('ignores a route computed for parts that have since moved', () => {
        rememberRouterRoute(first.id, { at: firstAt(INITIAL_DESIGN), ...anchors, vertices: BENDS });
        const moved: Design = {
            ...INITIAL_DESIGN,
            components: INITIAL_DESIGN.components.map((component) =>
                component.id === first.from.component ? { ...component, position: { x: component.position.x + 40, y: component.position.y }} : component,
            ),
        };
        const record = wireRecord(moved);
        clearRouterRoutes();
        expect(record.vertices).toBeUndefined();
        expect(record.data).toEqual({ kind: 'wire', wireId: first.id, unrouted: true });
    });
});
