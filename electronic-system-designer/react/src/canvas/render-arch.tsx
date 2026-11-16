// Architecture renderer: <Paper renderElement> draws the subsystem blocks as
// pure SVG inside each cell's own group. Bundles are native JointJS links
// (their look: views/link-look.ts).
//
// State never lives here: findings and the active trace are read from the
// zustand store per cell id and expressed as `data-*` attributes; index.css
// owns every color, so both themes stay tuned in one place.

import type { RenderElement } from '@joint/react-plus';
import {
    useCellDimmed,
    useCellFlag,
    useCellTraced,
    useDesignerStore,
    useSubsystem,
} from '@/state/designer-store';
import { boardName } from '@/model/design';
import { severityVerb } from '@/model/validation';
import { ArchBlock } from '@/symbols/arch-block';
import { FlagBadge } from '@/symbols/flag-badge';
import { isSubsystemCell, isSubsystemDropCell, type AnyCellData } from '@/views/cell-data';
import { getSubsystemTemplate, type SubsystemTemplateId } from '@/views/subsystem-templates';

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
