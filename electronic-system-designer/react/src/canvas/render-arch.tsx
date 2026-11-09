// Architecture renderers: <Paper renderElement> draws subsystem blocks,
// <Paper renderLink> draws typed interface bundles — both pure SVG inside
// the cells' own groups (joint-react's default SVG portal).
//
// State never lives here: liveness, findings, and the active trace are read
// from the zustand store per cell id and expressed as `data-*` attributes;
// index.css owns every color, so both themes stay tuned in one place.

import { useIsCellSelected, useLinkLayout, type RenderElement, type RenderLink } from '@joint/react-plus';
import { useShallow } from 'zustand/react/shallow';
import {
    useCellDimmed,
    useCellFlag,
    useCellTraced,
    useDesignerStore,
    useSubsystem,
} from '@/state/designer-store';
import { boardName } from '@/model/design';
import { formatVolts, severityVerb } from '@/model/validation';
import { ArchBlock } from '@/symbols/arch-block';
import { FlagBadge } from '@/symbols/flag-badge';
import {
    isBundleCell,
    isBundleWireCell,
    isSubsystemCell,
    isSubsystemDropCell,
    type AnyCellData,
} from '@/views/cell-data';
import { getSubsystemTemplate, type SubsystemTemplateId } from '@/views/subsystem-templates';
import { nameLinkRoot } from './link-a11y';
import { pathMidpoint } from './path-label';

// --- Elements --------------------------------------------------------------

function SubsystemCell({ subsystemId }: { readonly subsystemId: string }) {
    const subsystem = useSubsystem(subsystemId);
    const boardLabel = useDesignerStore((state) => {
        const boardId = state.design.subsystems.find((candidate) => candidate.id === subsystemId)?.board;
        return boardId === undefined ? '' : boardName(state.design, boardId);
    });
    const openSubsystemDetail = useDesignerStore((state) => state.openSubsystemDetail);
    const flag = useCellFlag(subsystemId);
    const traced = useCellTraced(subsystemId);
    const dimmed = useCellDimmed(subsystemId);
    // Brief teardown gap: the paper can re-render a removed cell's portal once.
    if (subsystem === undefined) return null;
    const { width } = subsystem.size;
    return (
    // A real button: focus selects (canvas-level focusin), Enter/Space DRILLS
    // DOWN into the subsystem's detailed connectivity.
        <g
            className="esd-cell esd-focusable"
            role="button"
            aria-label={`${subsystem.name} subsystem — open detailed connectivity${flag === undefined ? '' : `, has a suggestion to ${severityVerb(flag)}`}`}
            tabIndex={0}
            data-flag={flag}
            data-traced={traced}
            data-dimmed={dimmed}
            onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                openSubsystemDetail(subsystemId);
            }}
        >
            <ArchBlock subsystem={subsystem} boardName={boardLabel} />
            {flag === undefined ? null : <FlagBadge severity={flag} x={width - 4} y={4} />}
        </g>
    );
}

/** Palette drag preview — a plain ghost block (no store/Diagram hooks: the
 * stencil renders it in its own flying paper outside the app's Diagram). */
function TemplateGhost({ template }: { readonly template: SubsystemTemplateId }) {
    const known = getSubsystemTemplate(template);
    return (
        <g className="esd-cell">
            <polygon className="esd-block" points="12,0 196,0 196,120 184,132 0,132 0,12" />
            <text className="esd-block-name" x={98} y={70} textAnchor="middle">
                {known.name}
            </text>
        </g>
    );
}

export const RenderArchCell: RenderElement<AnyCellData> = (data) => {
    if (isSubsystemCell(data)) return <SubsystemCell subsystemId={data.subsystemId} />;
    if (isSubsystemDropCell(data)) return <TemplateGhost template={data.template} />;
    return null;
};

// --- Links -----------------------------------------------------------------

function BundleWire({ bundleId }: { readonly bundleId: string }) {
    // Primitive picks — the bundle index is rebuilt per commit, so selecting
    // the bundle OBJECT would re-render every bundle on every drag frame.
    const { iface, label, wireCount, volts } = useDesignerStore(
        useShallow((state) => {
            const bundle = state.bundles.bundles.find((candidate) => candidate.id === bundleId);
            const firstWire = bundle?.wireIds[0];
            const net = firstWire === undefined ? undefined : state.nets.byWire.get(firstWire);
            return {
                iface: bundle?.iface,
                label: bundle?.label,
                wireCount: bundle?.wireIds.length ?? 0,
                // Live overlay: the rail level this power bundle carries, so the
                // architecture view shows operating values too, not just motion.
                volts:
          state.liveMode && bundle?.iface === 'power' && net !== undefined
              ? state.operating.netVolts.get(net.id)
              : undefined,
            };
        }),
    );
    const liveMode = useDesignerStore((state) => state.liveMode);
    const selected = useIsCellSelected();
    const flag = useCellFlag(bundleId);
    const traced = useCellTraced(bundleId);
    const dimmed = useCellDimmed(bundleId);
    const layout = useLinkLayout();
    if (iface === undefined || !layout || layout.d === '') return null;

    const multi = wireCount > 1;
    const powered = iface === 'power';
    const mid = pathMidpoint(layout.d);
    return (
    // Decoration only — pointer events stay with the native wrapper.
        <g
            ref={nameLinkRoot(`${label ?? ''} bundle${multi ? `, ${wireCount} signals` : ''}`)}
            data-iface={iface}
            data-flag={flag}
            data-traced={traced}
            data-dimmed={dimmed}
            pointerEvents="none"
        >
            {selected || traced ? (
                <path className="esd-wire-halo" d={layout.d} strokeWidth={multi ? 11 : 9} />
            ) : null}
            <path className="esd-bundle" d={layout.d} strokeWidth={multi ? 3.5 : 2} />
            {/* A bundle of several signals reads as a double line. */}
            {multi ? <path className="esd-bundle-core" d={layout.d} strokeWidth={1.2} /> : null}
            {/* Live mode: power bundles show energy flow, protocol bundles show
          bus activity as a marching dash. */}
            {liveMode && powered ? (
                <circle className="esd-flow" r={3.4}>
                    <animateMotion dur="2.2s" repeatCount="indefinite" path={layout.d} />
                </circle>
            ) : null}
            {liveMode && !powered && iface !== 'gnd' && iface !== 'gpio' ? (
                <path className="esd-activity" d={layout.d} />
            ) : null}
            {mid === null ? null : (
                <text
                    className="esd-wire-label"
                    x={mid.vertical ? mid.x + 7 : mid.x}
                    y={mid.vertical ? mid.y + 3 : mid.y - 6}
                    textAnchor={mid.vertical ? 'start' : 'middle'}
                >
                    {label}
                    {multi ? ` ×${wireCount}` : ''}
                    {volts !== undefined && volts > 0 ? ` · ${formatVolts(volts)}` : ''}
                </text>
            )}
        </g>
    );
}

/** One member signal of an EXPANDED bundle — drawn like a schematic wire,
 * named after its net (double-click collapses the bus again). */
function BundleMemberWire({ wireId }: { readonly wireId: string }) {
    // Primitive picks for the same reason as BundleWire: net objects are
    // rebuilt per commit.
    const { netName, iface } = useDesignerStore(
        useShallow((state) => {
            const net = state.nets.byWire.get(wireId);
            return { netName: net?.name, iface: net?.iface };
        }),
    );
    const selected = useIsCellSelected();
    const flag = useCellFlag(wireId);
    const traced = useCellTraced(wireId);
    const dimmed = useCellDimmed(wireId);
    const layout = useLinkLayout();
    if (!layout || layout.d === '') return null;

    const mid = pathMidpoint(layout.d);
    return (
        <g
            ref={nameLinkRoot(`${netName ?? 'Unnamed'} wire`)}
            data-iface={iface ?? 'gpio'}
            data-flag={flag}
            data-traced={traced}
            data-dimmed={dimmed}
            pointerEvents="none"
        >
            {selected || traced ? <path className="esd-wire-halo" d={layout.d} strokeWidth={8} /> : null}
            <path className="esd-sch-wire" d={layout.d} strokeWidth={1.6} />
            {mid === null || netName === undefined ? null : (
                <text
                    className="esd-wire-label"
                    x={mid.vertical ? mid.x + 7 : mid.x}
                    y={mid.vertical ? mid.y + 3 : mid.y - 5}
                    textAnchor={mid.vertical ? 'start' : 'middle'}
                >
                    {netName}
                </text>
            )}
        </g>
    );
}

export const RenderArchLink: RenderLink<AnyCellData> = (data) => {
    if (isBundleCell(data)) return <BundleWire bundleId={data.bundleId} />;
    if (isBundleWireCell(data)) return <BundleMemberWire wireId={data.wireId} />;
    return null;
};
