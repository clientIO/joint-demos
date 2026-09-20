import { HTMLHost, selectElementData, useCell, useCellId, useGraph } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { GROUP_ICONS, GROUP_LABELS, Group } from '../shapes';
import type { GroupStartData } from '../shapes';
import { MoreButton, PlusIcon } from './buttons';
import { useAddBelow } from './use-add-below';
import { KindIcon } from './kind-icon';
import { TipButton } from '../tooltip';

/**
 * The start of a group: a filled pill labelled with the kind of the group,
 * its icon, the collapse/expand button of the group on its bottom edge and,
 * for a fork with a branch, the button at its right end that adds another
 * (an empty fork gets its first through the insert button of its link).
 * Collapsed, it stands in for the group.
 */
export function GroupStartView(): ReactNode {
    const { kind, collapsed, hasBranches } = useCell(selectElementData<GroupStartData>);
    const id = useCellId();
    const editor = useEditor();
    const { graph } = useGraph();
    const add = useAddBelow(String(id));
    const group = graph.getCell(id)?.getParentCell();
    return (
        <HTMLHost className={`pill group-start filled${editor.selectedId === id ? ' selected' : ''}`}>
            <KindIcon d={GROUP_ICONS[kind]} />
            <span className="text"><span className="label">{GROUP_LABELS[kind]}</span></span>
            {kind === 'fork' && hasBranches && !add.hidden ? (
                <TipButton tip={editor.moved ? 'Move here' : 'Add a branch'} className="pill-add" onClick={add.onClick}>
                    <PlusIcon />
                </TipButton>
            ) : null}
            <TipButton
                tip={collapsed ? 'Expand' : 'Collapse'}
                className="toggle"
                onClick={() => {
                    if (group && Group.isGroup(group)) editor.toggleGroup(group);
                }}
                // Hovering the button fades what a collapse would hide.
                onMouseEnter={() => {
                    if (group && Group.isGroup(group)) editor.previewCollapse(group);
                }}
                onMouseLeave={() => editor.previewCollapse(null)}
            >
                <svg viewBox="-9 -9 18 18" width="18" height="18" aria-hidden="true">
                    <path d={collapsed ? 'M -4 0 4 0 M 0 -4 0 4' : 'M -4 0 4 0'} stroke="currentColor" strokeWidth={2} fill="none" />
                </svg>
            </TipButton>
            <MoreButton />
        </HTMLHost>
    );
}
