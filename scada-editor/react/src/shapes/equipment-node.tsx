import type { EquipmentData } from '../plant/model';
import { CATALOG, isAcross, isEquipmentKind, sidePoint, STUB_THICKNESS, TERMINAL_LENGTH, type EquipmentSpec } from './catalog';
import { METAL, useMetal, type Metal } from './metal';

const LABEL_GAP = 12;
// The tag's line under the name's.
const TAG_LINE_OFFSET = 17;
// How far the rings stand off the body: the pending one inside the alarm one.
const PENDING_RING_GAP = 8;
const ALARM_RING_GAP = 10;
// How far a stub reaches under the body, so no gap shows at a round side.
const STUB_TUCK = 20;

/** The pipe stubs and the electrical leads of a kind: their flanges and terminals are its ports. */
function Connectors({ spec, metal }: { readonly spec: EquipmentSpec; readonly metal: Metal }) {
    return (
        <g className="connectors">
            {spec.stubs?.filter((stub) => stub.length > 0).map(({ id, side, at = 0.5, length }) => {
                const inner = sidePoint(side, at, -STUB_TUCK, spec.width, spec.height);
                const outer = sidePoint(side, at, length, spec.width, spec.height);
                const isHorizontal = isAcross(side);
                const x = Math.min(inner.x, outer.x) - (isHorizontal ? 0 : STUB_THICKNESS / 2);
                const y = Math.min(inner.y, outer.y) - (isHorizontal ? STUB_THICKNESS / 2 : 0);
                const width = isHorizontal ? Math.abs(outer.x - inner.x) : STUB_THICKNESS;
                const height = isHorizontal ? STUB_THICKNESS : Math.abs(outer.y - inner.y);
                // Outlined along the pipe only: its ends meet the body and the flange.
                const edges = isHorizontal
                    ? `M${x} ${y} h${width} M${x} ${y + height} h${width}`
                    : `M${x} ${y} v${height} M${x + width} ${y} v${height}`;
                return (
                    <g key={id}>
                        <rect x={x} y={y} width={width} height={height} fill={isHorizontal ? metal.pipe : metal.cylinder} />
                        <path d={edges} fill="none" stroke={METAL.stroke} strokeWidth={2} />
                    </g>
                );
            })}
            {spec.terminals?.map(({ id, side, at = 0.5 }) => {
                const from = sidePoint(side, at, 0, spec.width, spec.height);
                const to = sidePoint(side, at, TERMINAL_LENGTH, spec.width, spec.height);
                return <path key={id} className="lead" d={`M${from.x} ${from.y} L${to.x} ${to.y}`} />;
            })}
        </g>
    );
}

interface EquipmentDrawingProps {
    readonly data: EquipmentData;
    readonly hasLabel: boolean;
}

/** The whole drawing of an element: its rings, connectors, symbol and label. */
function EquipmentDrawing({ data, hasLabel }: EquipmentDrawingProps) {
    const spec = CATALOG[data.kind];
    const metal = useMetal();
    const { Icon } = spec;
    return (
        <g
            className="equipment"
            data-kind={data.kind}
            data-active={data.active === true}
            data-alarm={data.alarm === true}
            data-pending={data.pending === true}
            data-control={spec.control !== undefined}
            data-locked={data.locked === true}
        >
            {metal.defs}
            <rect
                className="pending-ring"
                x={-PENDING_RING_GAP}
                y={-PENDING_RING_GAP}
                width={spec.width + 2 * PENDING_RING_GAP}
                height={spec.height + 2 * PENDING_RING_GAP}
                rx={10}
            />
            <rect
                className="alarm-ring"
                x={-ALARM_RING_GAP}
                y={-ALARM_RING_GAP}
                width={spec.width + 2 * ALARM_RING_GAP}
                height={spec.height + 2 * ALARM_RING_GAP}
                rx={12}
            />
            <Connectors spec={spec} metal={metal} />
            <Icon data={data} metal={metal} />
            {hasLabel && (
                <>
                    <text className="equipment-label" x={spec.width / 2} y={spec.height + LABEL_GAP} dominantBaseline="hanging">
                        {data.name}
                    </text>
                    <text className="equipment-tag" x={spec.width / 2} y={spec.height + LABEL_GAP + TAG_LINE_OFFSET} dominantBaseline="hanging">
                        {data.tag}
                    </text>
                </>
            )}
        </g>
    );
}

/**
 * An element of the diagram, drawn as the TypeScript SCADA editor draws it:
 * its stubs, its shaded body and its label, in the size of its kind. JointJS
 * places it; React draws it from `data`, so a move never re-renders it.
 */
export function EquipmentNode(data: EquipmentData) {
    // A cell of a kind this editor doesn't know draws nothing rather than failing the page.
    if (typeof data.kind !== 'string' || !isEquipmentKind(data.kind)) {
        return null;
    }
    return <EquipmentDrawing data={data} hasLabel />;
}

/** A kind drawn alone, for the palette: its symbol and stubs, no label. */
export function EquipmentPreview({ data }: { readonly data: EquipmentData }) {
    return <EquipmentDrawing data={data} hasLabel={false} />;
}
