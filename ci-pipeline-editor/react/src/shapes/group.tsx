import { dia } from '@joint/plus';
import { ElementModel, HTMLHost, selectElementData, useCell } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { TipButton } from '../components/tooltip';
import { MoreButton, PlusIcon } from './buttons';
import { ELEMENT_Z, GROUP_ICONS, GROUP_LABELS, NODE_SIZE } from './constants';
import type { GroupKind } from './constants';
import { KindIcon } from './kind-icon';
import { useAddBelow } from './use-add-below';
import { useCellModel } from './use-cell-model';

/*
    A group - a fork or a loop - and its gates: the group itself, never
    rendered, its start node, a pill with a component, and its end node, a
    point without a picture.
*/

export const GROUP_TYPE = 'Group';
export const GROUP_START_TYPE = 'GroupStart';
export const GROUP_END_TYPE = 'GroupEnd';

/** The React-facing state of the start of a group: the kind of the group, whether it is collapsed and, for a fork, whether it has a branch - its add button shows once it has one. */
export interface GroupStartData {
    kind: GroupKind;
    collapsed: boolean;
    hasBranches: boolean;
}

/**
 * The start of a group: a filled pill labelled with the kind of the group,
 * with the icon of the kind and the collapse/expand button of the group on
 * its bottom edge. The start of a fork also carries, at its right end, the
 * button that adds a branch. When the group is collapsed the start stays
 * visible in its place and stands in for it.
 */
export class GroupStartModel extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: GROUP_START_TYPE, z: ELEMENT_Z, size: NODE_SIZE };
    }

    static create(kind: GroupKind, collapsed: boolean = false, hasBranches: boolean = false): GroupStartModel {
        const data: GroupStartData = { kind, collapsed, hasBranches };
        return new GroupStartModel({ data });
    }

    getKind(): GroupKind {
        return (this.get('data') as GroupStartData).kind;
    }

    static isGroupStart(cell: dia.Cell): cell is GroupStartModel {
        return cell instanceof GroupStartModel;
    }
}

/**
 * The end of a group: a point without size and without a picture. The paths
 * of the group converge into it, and the tree continues from it. Not an
 * `ElementModel`: it has nothing for React to render, and the paper shows
 * a link only once the React content of both of its ends is mounted - an
 * element without a portal counts as mounted.
 */
export class GroupEndModel extends dia.Element {

    preinitialize() {
        this.markup = [];
    }

    defaults() {
        return { ...super.defaults, type: GROUP_END_TYPE, z: ELEMENT_Z, size: { width: 0, height: 0 } };
    }

    static create(): GroupEndModel {
        return new GroupEndModel();
    }

    /** The group the end closes. */
    getGroup(): GroupModel {
        const group = this.getParentCell();
        if (!group || !GroupModel.isGroup(group)) throw new Error(`The end ${this.id} is not in a group.`);
        return group;
    }

    static isGroupEnd(cell: dia.Cell): cell is GroupEndModel {
        return cell instanceof GroupEndModel;
    }
}

/** The gates of a group: the nodes the paths of the group run between. */
export type Gate = GroupStartModel | GroupEndModel;

export function isGate(cell: dia.Cell): cell is Gate {
    return cell instanceof GroupStartModel || cell instanceof GroupEndModel;
}

/**
 * A container that stands in for a subgraph the tree layout cannot handle:
 * a `start` node, content of a `kind` (branches, or a loop) and an `end`
 * node. The outer tree links connect to the group itself, but the group is
 * positioned and sized from its `start` to its `end`, and the links are
 * anchored on those two gates (see `anchorGroupLinks()` in `layout/index.ts`)
 * - the tree appears to connect to them. The group is never rendered: the
 * paper's `cellVisibility` hides it, so it is only a node of the layout.
 * Not an `ElementModel`: no React content (see `GroupEndModel`).
 *
 * A collapsed group shrinks to the size of a node and hides its content. Its
 * `start` node, labelled with the kind of the group, stays visible in its
 * place and stands in for it.
 */
export class GroupModel extends dia.Element {

    preinitialize() {
        // Never rendered; a valid markup nonetheless.
        this.markup = [];
    }

    defaults() {
        return { ...super.defaults, type: GROUP_TYPE, z: ELEMENT_Z, size: NODE_SIZE, kind: 'fork' satisfies GroupKind, collapsed: false };
    }

    static create(kind: GroupKind): GroupModel {
        return new GroupModel({ kind });
    }

    getKind(): GroupKind {
        return this.get('kind');
    }

    isCollapsed(): boolean {
        return Boolean(this.get('collapsed'));
    }

    getStart(): GroupStartModel {
        const start = this.getEmbeddedCells().find(GroupStartModel.isGroupStart);
        if (!start) throw new Error(`Group ${this.id} has no start.`);
        return start;
    }

    /**
     * The vertical axis the tree connects to the group on: the common axis of
     * its gates. A collapsed group is a plain node, connected in its middle.
     */
    getAxisX(): number {
        return this.isCollapsed() ? this.getBBox().center().x : this.getStart().getBBox().center().x;
    }

    getEnd(): GroupEndModel {
        const end = this.getEmbeddedCells().find(GroupEndModel.isGroupEnd);
        if (!end) throw new Error(`Group ${this.id} has no end.`);
        return end;
    }

    static isGroup(cell: dia.Cell): cell is GroupModel {
        return cell instanceof GroupModel;
    }
}

/**
 * The start of a group: a filled pill labelled with the kind of the group,
 * its icon, the collapse/expand button of the group on its bottom edge and,
 * for a fork with a branch, the button at its right end that adds another
 * (an empty fork gets its first through the insert button of its link).
 * Collapsed, it stands in for the group.
 */
export function GroupStart(): ReactNode {
    const { kind, collapsed, hasBranches } = useCell(selectElementData<GroupStartData>);
    const model = useCellModel<GroupStartModel>();
    const editor = useEditor();
    const add = useAddBelow(model);
    const group = model.getParentCell();
    return (
        <HTMLHost className="pill group-start filled">
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
                    if (group && GroupModel.isGroup(group)) editor.toggleGroup(group);
                }}
                // Hovering the button fades what a collapse would hide.
                onMouseEnter={() => {
                    if (group && GroupModel.isGroup(group)) editor.previewCollapse(group);
                }}
                onMouseLeave={() => editor.previewCollapse(null)}
            >
                <svg viewBox="-9 -9 18 18" width="18" height="18" aria-hidden="true">
                    <path d={collapsed ? 'M -4 0 4 0 M 0 -4 0 4' : 'M -4 0 4 0'} stroke="currentColor" strokeWidth={2} fill="none" />
                </svg>
            </TipButton>
            <MoreButton filled />
        </HTMLHost>
    );
}
