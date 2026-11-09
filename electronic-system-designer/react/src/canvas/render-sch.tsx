// Connectivity (schematic) renderers: parts, pin-to-pin wires, and the board
// outlines. Same architecture as the architecture view — pure SVG in the
// cell's own group, all state expressed as `data-*` attributes, colors owned
// by index.css.

import { useCell, useIsCellSelected, useLinkLayout, type RenderElement, type RenderLink } from '@joint/react-plus';
import { getPart, IFACE_LABEL, type PartKindId } from '@/model/catalog';
import { formatVolts, severityVerb } from '@/model/validation';
import {
    useCellDimmed,
    useCellFlag,
    useCellTraced,
    useComponent,
    useDesignerStore,
    useJunctionPins,
    useWireLabeling,
} from '@/state/designer-store';
import { FlagBadge } from '@/symbols/flag-badge';
import { PartSymbol } from '@/symbols/part-symbol';
import { nameLinkRoot } from './link-a11y';
import { pathMidpoint } from './path-label';
import {
    isBoardFrameCell,
    isComponentCell,
    isPartDropCell,
    isWireCell,
    type AnyCellData,
    type BoardFrameCellData,
} from '@/views/cell-data';

// --- Elements --------------------------------------------------------------

function ComponentCell({ componentId }: { readonly componentId: string }) {
    const component = useComponent(componentId);
    const junctionPins = useJunctionPins(componentId);
    const flag = useCellFlag(componentId);
    const traced = useCellTraced(componentId);
    const dimmed = useCellDimmed(componentId);
    const liveMode = useDesignerStore((state) => state.liveMode);
    const supply = useDesignerStore((state) => state.operating.supplyVolts.get(componentId));
    // The LED lights when its anode net carries a level while animating.
    const lit = useDesignerStore((state) => {
        if (!state.liveMode) return false;
        const net = state.nets.byPin.get(`${componentId}:a`);
        return net !== undefined && (state.operating.netVolts.get(net.id) ?? 0) > 1;
    });
    if (component === undefined) return null;
    const part = getPart(component.part);
    const { width, height } = part.size;
    const name = `${component.ref} ${part.name}`;
    return (
    // role="img": named and focusable (focus selects via the canvas-level
    // focusin handler) without promising a button activation that a symbol
    // does not have. A bare <g> would be role `generic`, which drops the label.
        <g
            className="esd-cell esd-focusable"
            role="img"
            aria-label={`${name}${flag === undefined ? '' : `, has a suggestion to ${severityVerb(flag)}`}`}
            tabIndex={0}
            data-flag={flag}
            data-traced={traced}
            data-dimmed={dimmed}
            data-lit={part.id === 'led' ? lit : undefined}
        >
            {/* Invisible hit surface so thin symbols stay easy to grab. */}
            <rect className="esd-hit" x={-4} y={-4} width={width + 8} height={height + 8} fill="transparent" />
            <PartSymbol part={part} refLabel={component.ref} junctionPins={junctionPins} nativePins />
            {liveMode && supply !== undefined && part.currentMa !== undefined ? (
                <text className="esd-live-chip" x={width} y={-6} textAnchor="end">
                    {formatVolts(supply)}
                </text>
            ) : null}
            {flag === undefined ? null : <FlagBadge severity={flag} x={width - 2} y={2} />}
        </g>
    );
}

/** Palette drag preview (rendered outside the Diagram — no hooks). */
function PartGhost({ part }: { readonly part: PartKindId }) {
    const def = getPart(part);
    return (
        <g className="esd-cell">
            <PartSymbol part={def} refLabel={def.refPrefix} />
        </g>
    );
}

function BoardFrame({ data }: { readonly data: BoardFrameCellData }) {
    // The outline is drawn from the cell's LIVE size, not the record data: the
    // resize handles change the model on every pointer move, while the data
    // (derived from the Design) only follows once the drag commits. Drawn from
    // the data, the dashed outline sat still under a moving handle.
    const width = useCell((cell) => ('size' in cell ? cell.size.width : data.width));
    const height = useCell((cell) => ('size' in cell ? cell.size.height : data.height));
    return (
        <g className="esd-cell esd-focusable" role="img" aria-label={`${data.name} board outline`} tabIndex={0}>
            <rect className="esd-frame-outline" width={width} height={height} rx={2} pointerEvents="none" />
            {/* Grab surface: the dashed EDGE (a wide invisible stroke) plus the
          name — the interior stays click-through, so parts, wires, and blank
          panning inside the outline keep working. */}
            <rect className="esd-frame-hit" width={width} height={height} rx={2} />
            <text className="esd-frame-label" x={14} y={24}>
                {data.name.toUpperCase()}
            </text>
        </g>
    );
}

export const RenderSchCell: RenderElement<AnyCellData> = (data) => {
    if (isComponentCell(data)) return <ComponentCell componentId={data.componentId} />;
    if (isBoardFrameCell(data)) return <BoardFrame data={data} />;
    if (isPartDropCell(data)) return <PartGhost part={data.part} />;
    return null;
};

// --- Links -----------------------------------------------------------------

function SchWire({ wireId }: { readonly wireId: string }) {
    const { netName, iface: netIface, showLabel, joined, labelAt } = useWireLabeling(wireId);
    const liveMode = useDesignerStore((state) => state.liveMode);
    const volts = useDesignerStore((state) => {
        const own = state.nets.byWire.get(wireId);
        return own === undefined ? undefined : state.operating.netVolts.get(own.id);
    });
    const selected = useIsCellSelected();
    const flag = useCellFlag(wireId);
    const traced = useCellTraced(wireId);
    const dimmed = useCellDimmed(wireId);
    const layout = useLinkLayout();
    if (!layout || layout.d === '') return null;

    const iface = netIface ?? 'gpio';
    const powered = iface === 'power';
    // The field buses run as differential pairs — badge them the way an EDA
    // schematic does (the little twisted-pair "eye" next to the net name).
    const differential = iface === 'rs485' || iface === 'can';
    const mid = showLabel ? pathMidpoint(layout.d, labelAt) : null;
    // The pair badge anchors a third of the way along the run — the label,
    // the flag badge, and the corner elbows all crowd the far (label) end.
    const pairAt = differential && showLabel ? pathMidpoint(layout.d, 0.3) : null;
    return (
        <g
            ref={nameLinkRoot(`${netName ?? 'Unnamed'} wire, ${IFACE_LABEL[iface]}`)}
            data-iface={iface}
            data-flag={flag}
            data-traced={traced}
            data-dimmed={dimmed}
            pointerEvents="none"
        >
            {selected || traced ? <path className="esd-wire-halo" d={layout.d} strokeWidth={9} /> : null}
            <path className="esd-sch-wire" d={layout.d} strokeWidth={powered ? 2.4 : 1.6} />
            {liveMode && powered && (volts ?? 0) > 0 ? (
                <circle className="esd-flow" r={2.8}>
                    <animateMotion dur="2s" repeatCount="indefinite" path={layout.d} />
                </circle>
            ) : null}
            {/* Animation: protocol nets show bus activity as a marching dash. */}
            {liveMode && !powered && iface !== 'gnd' && iface !== 'gpio' ? (
                <path className="esd-activity" d={layout.d} />
            ) : null}
            {/* Differential-pair badge, once per labeled run, with a plain-words
          tooltip (its own hover target — the wire group eats no events). */}
            {pairAt !== null ? (
                <g
                    className="esd-diff-pair"
                    // A lens, not an ✗ — crossing strokes would read as a no-connect
                    // mark in schematic shorthand.
                    transform={`translate(${pairAt.vertical ? pairAt.x - 24 : pairAt.x - 9}, ${pairAt.vertical ? pairAt.y - 9 : pairAt.y - 10})`}
                    pointerEvents="all"
                >
                    <title>
            Differential pair — this net is one half; route both lines together and terminate the
            pair at the ends.
                    </title>
                    <rect x={-3} y={-8} width={24} height={16} fill="transparent" />
                    <path d="M 0 0 C 5 -6, 13 -6, 18 0" />
                    <path d="M 0 0 C 5 6, 13 6, 18 0" />
                </g>
            ) : null}
            {netName !== undefined && mid !== null ? (
                <g className="esd-wire-label" data-joined={joined || undefined}>
                    {/* A label that JOINS wire groups carries connectivity — it gets
              the off-page-connector chevron so it can't pass for decoration. */}
                    {joined ? (
                        <path
                            className="esd-net-flag"
                            d={
                                mid.vertical
                                    ? `M${mid.x + 6},${mid.y + 8} l4,-5 -4,-5`
                                    : `M${mid.x - 4},${mid.y - 12} l4,5 -4,5`
                            }
                        />
                    ) : null}
                    <text
                        x={mid.vertical ? mid.x + (joined ? 14 : 6) : mid.x + (joined ? 4 : 0)}
                        y={mid.vertical ? mid.y + 3 : mid.y - 5}
                        textAnchor={mid.vertical ? 'start' : joined ? 'start' : 'middle'}
                    >
                        {netName}
                        {liveMode && volts !== undefined && volts > 0 ? ` · ${formatVolts(volts)}` : ''}
                    </text>
                </g>
            ) : null}
        </g>
    );
}

// A wire without a route for the current geometry draws nothing yet: a
// pin-to-pin line that then jumps onto its route reads as a glitch.
export const RenderSchLink: RenderLink<AnyCellData> = (data) =>
    isWireCell(data) && data.unrouted !== true ? <SchWire wireId={data.wireId} /> : null;
