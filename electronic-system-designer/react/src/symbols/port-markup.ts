// Native JointJS ports for both canvases: schematic PINS on part symbols and
// typed interface PORTS on architecture blocks.
//
// Every pin/port is a real `ports` item, so JointJS owns the magnet: a wire
// dragged out of a stub records `{ id, port, magnet }` on its end, the magnet
// resolves by selector, and the default `center` anchor lands on the stub
// tip with no connection-strategy workaround. The avoid router reads the same
// ports as its connection pins.
//
// A port sits on the body EDGE (libavoid clamps pins to the shape box), and
// its markup draws outward: the stub line, the texts, and the hit zone
// centered on the stub TIP. Pure data, no React: the view derivations (run by
// node tests) import it.

import type { dia } from '@joint/plus';

export type Side = 'left' | 'right' | 'top' | 'bottom';

/** Schematic pin stub length outside the body. */
export const PIN_STUB = 14;
/** Architecture port stub length outside the block edge. */
const PORT_STUB = 16;
/** Square hit zone on a schematic pin tip; generous on purpose. */
const PIN_MAGNET = 18;
/** Square hit zone on an architecture port tip. */
const PORT_MAGNET = 22;

/** Selector of the hit zone inside every port; link ends name it as `magnet`. */
export const PORT_MAGNET_SELECTOR = 'magnet';

const SIDES: readonly Side[] = ['left', 'right', 'top', 'bottom'];

/** Unit vector pointing OUT of the body on each side. */
const OUTWARD: Readonly<Record<Side, { readonly x: number; readonly y: number }>> = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
};

/** The stub tip, relative to the port (body-edge) position. */
export function stubTip(side: Side, length: number): { readonly x: number; readonly y: number } {
    return { x: OUTWARD[side].x * length, y: OUTWARD[side].y * length };
}

/** Where a pin/port sits on an element of the given size: its body-edge point. */
export function edgePoint(side: Side, offset: number, width: number, height: number): { readonly x: number; readonly y: number } {
    switch (side) {
        case 'left':
            return { x: 0, y: offset };
        case 'right':
            return { x: width, y: offset };
        case 'top':
            return { x: offset, y: 0 };
        case 'bottom':
            return { x: offset, y: height };
    }
}

function hitZone(side: Side, length: number, size: number) {
    const tip = stubTip(side, length);
    return {
        x: tip.x - size / 2,
        y: tip.y - size / 2,
        width: size,
        height: size,
        // Round: the hover / drag hints read as a ring on the stub tip.
        rx: size / 2,
        fill: 'transparent',
        magnet: 'active',
    };
}

/** The name INSIDE the body, beside the stub (`top`/`bottom`: baselines from the edge). */
function innerText(side: Side, inset: number, top: number, bottom: number) {
    switch (side) {
        case 'left':
            return { x: inset, y: 3.5, textAnchor: 'start' };
        case 'right':
            return { x: -inset, y: 3.5, textAnchor: 'end' };
        case 'top':
            return { x: 0, y: top, textAnchor: 'middle' };
        case 'bottom':
            return { x: 0, y: -bottom, textAnchor: 'middle' };
    }
}

/** The pin number OUTSIDE, along the stub. */
function numberText(side: Side) {
    const tip = stubTip(side, PIN_STUB);
    return side === 'left' || side === 'right'
        ? { x: tip.x / 2, y: -3, textAnchor: 'middle' }
        : { x: 4, y: tip.y / 2 + 3, textAnchor: 'start' };
}

/** An element's `ports` attribute. */
type Ports = NonNullable<dia.Element.Attributes['ports']>;

const NO_LABEL: dia.Element.PortLabel = { markup: [] };

function schematicGroup(side: Side): dia.Element.PortGroup {
    const tip = stubTip(side, PIN_STUB);
    return {
        position: { name: 'absolute' },
        markup: [
            { tagName: 'line', selector: 'stub', className: 'esd-pin-line' },
            { tagName: 'text', selector: 'pinName', className: 'esd-pin-name' },
            { tagName: 'text', selector: 'pinNumber', className: 'esd-pin-number' },
            { tagName: 'rect', selector: PORT_MAGNET_SELECTOR, className: 'esd-magnet' },
        ],
        attrs: {
            stub: { x1: 0, y1: 0, x2: tip.x, y2: tip.y },
            pinName: innerText(side, 5, 12, 6),
            pinNumber: numberText(side),
            [PORT_MAGNET_SELECTOR]: hitZone(side, PIN_STUB, PIN_MAGNET),
        },
        label: NO_LABEL,
    };
}

function archGroup(side: Side): dia.Element.PortGroup {
    const tip = stubTip(side, PORT_STUB);
    const horizontal = side === 'left' || side === 'right';
    // The interface tick: a short colored bar on the block edge, inside the body.
    const tick = horizontal
        ? { x: side === 'left' ? 0 : -3, y: -6, width: 3, height: 12 }
        : { x: -6, y: side === 'top' ? 0 : -3, width: 12, height: 3 };
    return {
        position: { name: 'absolute' },
        markup: [
            { tagName: 'line', selector: 'stub', className: 'esd-port-line' },
            { tagName: 'rect', selector: 'tick', className: 'esd-port-tick' },
            { tagName: 'text', selector: 'portLabel', className: 'esd-port-label' },
            { tagName: 'rect', selector: PORT_MAGNET_SELECTOR, className: 'esd-magnet' },
        ],
        attrs: {
            stub: { x1: 0, y1: 0, x2: tip.x, y2: tip.y },
            tick,
            portLabel: innerText(side, 8, 14, 8),
            [PORT_MAGNET_SELECTOR]: hitZone(side, PORT_STUB, PORT_MAGNET),
        },
        label: NO_LABEL,
    };
}

const SCHEMATIC_GROUPS: Record<string, dia.Element.PortGroup> = Object.fromEntries(
    SIDES.map((side) => [side, schematicGroup(side)]),
);
const ARCH_GROUPS: Record<string, dia.Element.PortGroup> = Object.fromEntries(SIDES.map((side) => [side, archGroup(side)]));

export interface PinPortInput {
  readonly id: string;
  readonly side: Side;
  readonly offset: number;
  readonly name?: string;
  readonly number?: string;
}

/** The `ports` of a schematic part: one native port per pin. */
export function schematicPorts(pins: readonly PinPortInput[], width: number, height: number): Ports {
    return {
        groups: SCHEMATIC_GROUPS,
        items: pins.map((pin): dia.Element.Port => ({
            id: pin.id,
            group: pin.side,
            position: { args: edgePoint(pin.side, pin.offset, width, height) },
            attrs: { pinName: { text: pin.name ?? '' }, pinNumber: { text: pin.number ?? '' }},
        })),
    };
}

export interface ArchPortInput {
  readonly id: string;
  readonly side: Side;
  readonly offset: number;
  readonly label: string;
  readonly iface: string;
}

/** The `ports` of an architecture block: one native port per interface. */
export function archPorts(ports: readonly ArchPortInput[], width: number, height: number): Ports {
    return {
        groups: ARCH_GROUPS,
        items: ports.map((port): dia.Element.Port => ({
            id: port.id,
            group: port.side,
            position: { args: edgePoint(port.side, port.offset, width, height) },
            // data-iface resolves --wire-color for the tick and stub (index.css).
            attrs: { portRoot: { 'data-iface': port.iface }, portLabel: { text: port.label }},
        })),
    };
}
