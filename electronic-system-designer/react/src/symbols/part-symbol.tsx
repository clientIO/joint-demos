// The schematic symbol library — one data-driven renderer for every part.
//
// Pins come straight from the part catalog (position, name, number), so a
// part's drawing and its electrical model can never disagree. The body is an
// IC outline by default; connectors and passives get their conventional
// schematic shapes. Everything is pure SVG — the same component draws on the
// paper, in the palette thumbnails, and inside the navigator minimap.
//
// State (live colors, LED lit, findings) is NOT decided here: renderers
// put `data-*` attributes on the cell group and index.css maps them to color.

import { hidesPinNames, type PartDef, type PinDef } from '@/model/catalog';
import { PinStub } from './pin-stub';

export interface PartSymbolProps {
  readonly part: PartDef;
  /** Reference designator ("U3") drawn beside the body. */
  readonly refLabel: string;
  /** Pins where 3+ wires meet — drawn with a junction dot. */
  readonly junctionPins?: ReadonlySet<string>;
  /** On the paper the pins are native ports: draw only their junction dots. */
  readonly nativePins?: boolean;
}

function Pins({
    part,
    junctionPins,
    nativePins = false,
}: {
  readonly part: PartDef;
  readonly junctionPins?: ReadonlySet<string>;
  readonly nativePins?: boolean;
}) {
    const { width, height } = part.size;
    const hideName = hidesPinNames(part);
    return (
        <>
            {part.pins.map((pin: PinDef) => (
                <PinStub
                    key={pin.id}
                    pin={pin}
                    width={width}
                    height={height}
                    hideName={hideName}
                    junction={junctionPins?.has(pin.id) ?? false}
                    junctionOnly={nativePins}
                />
            ))}
        </>
    );
}

/** Chamfered IC body (the JointJS diagonal, top-left). No pin-1 dot: that is
 * a package/footprint convention — a schematic identifies pins by their drawn
 * numbers, which every stub already carries. */
function IcBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    const chamfer = 10;
    return (
        <g>
            <polygon
                className="esd-body"
                points={`${chamfer},0 ${width},0 ${width},${height - chamfer} ${width - chamfer},${height} 0,${height} 0,${chamfer}`}
            />
            <text className="esd-part-name" x={width / 2} y={height / 2 - 2} textAnchor="middle">
                {part.name}
            </text>
            <text className="esd-part-footprint" x={width / 2} y={height / 2 + 13} textAnchor="middle">
                {part.footprint}
            </text>
        </g>
    );
}

function FuseBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    const mid = height / 2;
    return (
        <g>
            <rect className="esd-body" x={6} y={mid - 8} width={width - 12} height={16} />
            <line className="esd-stroke" x1={6} y1={mid} x2={width - 6} y2={mid} />
        </g>
    );
}

/** Box resistor (IEC), vertical or horizontal from the part's proportions. */
function ResistorBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    const vertical = height > width;
    return vertical ? (
        <rect className="esd-body" x={width / 2 - 8} y={14} width={16} height={height - 28} />
    ) : (
        <rect className="esd-body" x={14} y={height / 2 - 8} width={width - 28} height={16} />
    );
}

function LedBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    const cx = width / 2;
    const top = height / 2 - 10;
    const bottom = height / 2 + 10;
    return (
        <g>
            {/* Soft halo, visible only while the live overlay lights the LED. */}
            <circle className="esd-led-halo" cx={cx} cy={height / 2} r={16} />
            <line className="esd-stroke" x1={cx} y1={14} x2={cx} y2={top} />
            <polygon className="esd-fill" points={`${cx - 9},${top} ${cx + 9},${top} ${cx},${bottom}`} />
            <line className="esd-stroke" x1={cx - 9} y1={bottom} x2={cx + 9} y2={bottom} />
            <line className="esd-stroke" x1={cx} y1={bottom} x2={cx} y2={height - 14} />
            {/* Emission arrows. */}
            <path className="esd-stroke" d={`M${cx + 10} ${top - 2} l7 -7 m-3 0 h3 v3`} />
            <path className="esd-stroke" d={`M${cx + 16} ${top + 6} l7 -7 m-3 0 h3 v3`} />
        </g>
    );
}

function DcInputBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    return (
        <g>
            <rect className="esd-body" x={0} y={0} width={width} height={height} />
            {/* Terminal screws. */}
            <circle className="esd-stroke" cx={20} cy={20} r={7} />
            <circle className="esd-stroke" cx={20} cy={44} r={7} />
            <line className="esd-stroke" x1={15} y1={15} x2={25} y2={25} />
            <line className="esd-stroke" x1={15} y1={39} x2={25} y2={49} />
            <text className="esd-part-name" x={(width + 34) / 2} y={height - 10} textAnchor="middle">
        24 V DC
            </text>
        </g>
    );
}

function Rj45Body({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    return (
        <g>
            <rect className="esd-body" x={0} y={0} width={width - 10} height={height} />
            {/* The jack opening with its latch notch. */}
            <path
                className="esd-stroke"
                d={`M16 ${height / 2 - 26} h36 v14 h-8 v10 h-8 v8 h-20 v-8 h0 z`}
            />
            <text className="esd-part-name" x={(width - 10) / 2} y={height - 12} textAnchor="middle">
        RJ45
            </text>
        </g>
    );
}

function HeaderBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    return (
        <g>
            <rect className="esd-body" x={10} y={0} width={width - 20} height={height} />
            {/* One square pad per pin, aligned with the pin rows. */}
            {part.pins.map((pin) => (
                <rect key={pin.id} className="esd-fill" x={18} y={pin.offset - 4} width={8} height={8} />
            ))}
        </g>
    );
}

function FieldConnectorBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    const cx = width - 38;
    const cy = 52;
    return (
        <g>
            <rect className="esd-body" x={0} y={0} width={width} height={height} />
            {/* M12 face: shell, keyway, four contacts. */}
            <circle className="esd-stroke" cx={cx} cy={cy} r={26} />
            <circle className="esd-stroke" cx={cx} cy={cy} r={19} />
            <line className="esd-stroke" x1={cx - 4} y1={cy - 26} x2={cx + 4} y2={cy - 26} />
            <circle className="esd-fill" cx={cx - 8} cy={cy - 7} r={2.6} />
            <circle className="esd-fill" cx={cx + 8} cy={cy - 7} r={2.6} />
            <circle className="esd-fill" cx={cx - 8} cy={cy + 8} r={2.6} />
            <circle className="esd-fill" cx={cx + 8} cy={cy + 8} r={2.6} />
            {/* Off-page connector: the harness continues off this sheet. */}
            <g>
                <polygon className="esd-stroke" points={`${width - 26},${height - 24} ${width - 10},${height - 24} ${width - 2},${height - 17} ${width - 10},${height - 10} ${width - 26},${height - 10}`} />
                <text className="esd-part-footprint" x={width - 30} y={height - 13} textAnchor="end">
          To harness
                </text>
                <text className="esd-offpage-tag" x={width - 18} y={height - 13.5} textAnchor="middle">
          H1
                </text>
            </g>
        </g>
    );
}

/** A crimp splice: the little filled lens where two wires join in a harness. */
function SpliceBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    return (
        <ellipse className="esd-fill" cx={width / 2} cy={height / 2} rx={width / 2 - 8} ry={6} />
    );
}

function ChassisBody({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    const cx = width / 2;
    return (
        <g>
            <line className="esd-stroke" x1={cx} y1={0} x2={cx} y2={height / 2} />
            <line className="esd-stroke" x1={cx - 14} y1={height / 2} x2={cx + 14} y2={height / 2} />
            <line className="esd-stroke" x1={cx - 14} y1={height / 2} x2={cx - 20} y2={height / 2 + 10} />
            <line className="esd-stroke" x1={cx - 2} y1={height / 2} x2={cx - 8} y2={height / 2 + 10} />
            <line className="esd-stroke" x1={cx + 10} y1={height / 2} x2={cx + 4} y2={height / 2 + 10} />
        </g>
    );
}

function Body({ part }: { readonly part: PartDef }) {
    switch (part.id) {
        case 'fuse':
            return <FuseBody part={part} />;
        case 'res-10k':
        case 'res-120':
        case 'res-330':
            return <ResistorBody part={part} />;
        case 'led':
            return <LedBody part={part} />;
        case 'dc-input':
            return <DcInputBody part={part} />;
        case 'rj45':
            return <Rj45Body part={part} />;
        case 'sensor-header':
            return <HeaderBody part={part} />;
        case 'field-connector':
            return <FieldConnectorBody part={part} />;
        case 'chassis':
            return <ChassisBody part={part} />;
        case 'splice':
            return <SpliceBody part={part} />;
        default:
            return <IcBody part={part} />;
    }
}

export function PartSymbol({ part, refLabel, junctionPins, nativePins }: PartSymbolProps) {
    const { width } = part.size;
    // Passives label their VALUE beside the body ("10 kΩ"), not the full
    // catalog name — that lives in the BOM and the inspector.
    const sideLabel =
    hidesPinNames(part) && part.id !== 'chassis' ? part.name.split(' ').slice(0, 2).join(' ') : undefined;
    return (
    // Presentational drawing — the CELL's aria-label carries the name.
        <g aria-hidden>
            <Body part={part} />
            <Pins part={part} junctionPins={junctionPins} nativePins={nativePins} />
            <text className="esd-ref" x={0} y={-6}>
                {refLabel}
            </text>
            {sideLabel === undefined ? null : (
                <text className="esd-part-footprint" x={width + 5} y={part.size.height / 2 + 3}>
                    {sideLabel}
                </text>
            )}
        </g>
    );
}
