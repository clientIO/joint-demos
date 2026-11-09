// A schematic pin drawn in React: the stub line leaving the symbol body, the
// pin name just inside the edge, the physical pin number beside the stub.
//
// On the paper the pins are NATIVE JointJS ports (symbols/port-markup) and
// this component only draws the junction dot; the full drawing is for the
// symbol's off-paper uses (palette thumbnails, pinout tables, drop ghost).
// Both share one geometry, so a thumbnail and the paper never disagree.

import type { PinDef } from '@/model/catalog';
import { edgePoint, PIN_STUB, stubTip } from './port-markup';

export interface PinStubProps {
  readonly pin: PinDef;
  /** Symbol footprint, so right/bottom stubs know their edge. */
  readonly width: number;
  readonly height: number;
  /** Draw a junction dot at the tip (2+ wires meet at this pin — with the
   * pin itself that is a 3-way T, the joined-crossing convention). */
  readonly junction?: boolean;
  /** Hide the name label (crowded 2-pin passives draw none). */
  readonly hideName?: boolean;
  /** Only the junction dot: the stub itself is a native port on the paper. */
  readonly junctionOnly?: boolean;
}

export function PinStub({ pin, width, height, junction = false, hideName = false, junctionOnly = false }: PinStubProps) {
    const edge = edgePoint(pin.side, pin.offset, width, height);
    const tip = stubTip(pin.side, PIN_STUB);
    const tipX = edge.x + tip.x;
    const tipY = edge.y + tip.y;
    const dot = junction ? <circle className="esd-junction" cx={tipX} cy={tipY} r={3.2} /> : null;
    if (junctionOnly) return dot;

    const horizontal = pin.side === 'left' || pin.side === 'right';
    // Name sits INSIDE the body next to the stub; number OUTSIDE along it.
    const nameX = pin.side === 'left' ? 5 : pin.side === 'right' ? width - 5 : edge.x;
    const nameAnchor = pin.side === 'left' ? 'start' : pin.side === 'right' ? 'end' : 'middle';
    const nameY = horizontal ? edge.y + 3.5 : pin.side === 'top' ? 12 : height - 6;

    return (
        <g>
            <line className="esd-pin-line" x1={edge.x} y1={edge.y} x2={tipX} y2={tipY} />
            {hideName ? null : (
                <text className="esd-pin-name" x={nameX} y={nameY} textAnchor={nameAnchor}>
                    {pin.name}
                </text>
            )}
            {pin.number === undefined ? null : (
                <text
                    className="esd-pin-number"
                    x={horizontal ? (edge.x + tipX) / 2 : edge.x + 4}
                    y={horizontal ? edge.y - 3 : (edge.y + tipY) / 2 + 3}
                    textAnchor={horizontal ? 'middle' : 'start'}
                >
                    {pin.number}
                </text>
            )}
            {dot}
        </g>
    );
}
