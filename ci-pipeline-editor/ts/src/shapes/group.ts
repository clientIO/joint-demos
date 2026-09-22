import { dia, util } from '@joint/plus';

import { ADD_BUTTON_SELECTOR, ELEMENT_Z, GROUP_END_SIZE, GROUP_ICONS, GROUP_LABELS, NODE_SIZE } from './constants';
import type { GroupKind } from './constants';
import { ADD_BUTTON_ATTRS, COLLAPSE_ICON, EXPAND_ICON, FILLED_PILL_ATTRS, TOGGLE_ATTRS, addButtonMarkup, pillDefaults, pillMarkup, setPillLabel, showAddButton, toggleMarkup } from './pill';

/*
    A group - a fork or a loop - and its gates: the group itself, never
    rendered, its start node, a pill, and its end node, a point without a
    picture.
*/

/**
 * The start of a group: a filled pill labelled with the name of the group -
 * the kind of it, `Fork` or `Loop`, until it is given one - with the icon of
 * the kind and the collapse/expand button of the group on its bottom edge. The start of a fork also carries, at its right end, the
 * button that adds a branch - a fork may have any number of them; a loop
 * has one body, so its start has no such button. The button shows once the
 * fork has a branch (see `setAddButtonVisible()`); an empty fork gets its
 * first branch through the insert button of the link from its start to its
 * end. When the group is collapsed the start stays visible in its place and
 * stands in for it.
 */
export class GroupStartModel extends dia.Element {

    preinitialize(attributes?: { kind?: GroupKind }) {
        const markup = [...pillMarkup, ...toggleMarkup];
        this.markup = attributes?.kind === 'fork' ? [...markup, ...addButtonMarkup] : markup;
    }

    defaults() {
        return pillDefaults('tbg.GroupStart', {
            kind: 'fork' satisfies GroupKind,
            attrs: util.defaultsDeep({
                [ADD_BUTTON_SELECTOR]: { dataTooltip: 'Add a branch' }
            }, FILLED_PILL_ATTRS, TOGGLE_ATTRS, ADD_BUTTON_ATTRS)
        }, super.defaults);
    }

    /** The start of a group of `kind`, labelled with the name of the group or, with none, the kind itself. */
    static create(kind: GroupKind, label?: string): GroupStartModel {
        const start = new GroupStartModel({ kind });
        start.attr('kindIcon/d', GROUP_ICONS[kind]);
        setPillLabel(start, label || GROUP_LABELS[kind]);
        return start;
    }

    getKind(): GroupKind {
        return this.get('kind');
    }

    /** Shows or hides the add button of the start of a fork; the start of a loop has none. */
    setAddButtonVisible(visible: boolean): void {
        if (this.getKind() === 'fork') showAddButton(this, visible);
    }

    /** Flips the icon and the tooltip of the collapse/expand button. */
    setCollapsed(collapsed: boolean): void {
        this.attr({
            toggle: { dataTooltip: collapsed ? 'Expand' : 'Collapse' },
            toggleIcon: { d: collapsed ? EXPAND_ICON : COLLAPSE_ICON }
        });
    }

    static isGroupStart(cell: dia.Cell): cell is GroupStartModel {
        return cell instanceof GroupStartModel;
    }
}

/**
 * The end of a group: a point without size and without a picture. The paths
 * of the group converge into it, and the tree continues from it.
 */
export class GroupEndModel extends dia.Element {

    preinitialize() {
        this.markup = [];
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.GroupEnd',
            z: ELEMENT_Z,
            size: GROUP_END_SIZE
        }, super.defaults);
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
 * a `start` node, content of a `kind` (the branches of a fork, or a loop) and an
 * `end` node. The outer tree links connect to the group itself, but the
 * group is positioned and sized from its `start` to its `end`, and the links
 * are anchored on those two gates (see `anchorGroupLinks()` in `layout/index.ts`) - the tree appears to
 * connect to them. The group is never rendered: the paper's `cellVisibility`
 * hides it, so it is only a node of the layout.
 *
 * A collapsed group shrinks to the size of its `start` node and hides its
 * content. The `start`, labelled with the kind of the group, stays visible in
 * its place and stands in for it.
 *
 * The content of each kind is created and laid out by its own module
 * (`layout/fork.ts`, `layout/loop.ts`); the group only knows its gates.
 */
export class GroupModel extends dia.Element {

    preinitialize() {
        // Never rendered; a valid markup nonetheless.
        this.markup = util.svg/* xml */`
            <rect @selector="body"/>
        `;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Group',
            z: ELEMENT_Z,
            size: NODE_SIZE,
            kind: 'fork' satisfies GroupKind,
            collapsed: false,
            attrs: {
                body: { width: 'calc(w)', height: 'calc(h)', fill: 'none', stroke: 'none' }
            }
        }, super.defaults);
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
