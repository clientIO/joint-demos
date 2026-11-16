// Connectivity (schematic) renderer: parts and board outlines, pure SVG in
// each cell's own group, all state expressed as `data-*` attributes, colors
// owned by index.css. Wires are native JointJS links (their look:
// views/link-look.ts).

import { useCell, type RenderElement } from '@joint/react-plus';
import { getPart, type PartKindId } from '@/model/catalog';
import { formatVolts, severityVerb } from '@/model/validation';
import {
    useCellDimmed,
    useCellFlag,
    useCellTraced,
    useComponent,
    useDesignerStore,
    useJunctionPins,
} from '@/state/designer-store';
import { FlagBadge } from '@/symbols/flag-badge';
import { PartSymbol } from '@/symbols/part-symbol';
import {
    isBoardFrameCell,
    isComponentCell,
    isPartDropCell,
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
    // The outline follows the cell's size, which `fitToChildren` keeps around the parts.
    const width = useCell((cell) => ('size' in cell ? cell.size.width : 0));
    const height = useCell((cell) => ('size' in cell ? cell.size.height : 0));
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
