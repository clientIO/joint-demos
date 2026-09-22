/*
    The layout metrics, the colors and the icons shared by the models, the
    layout, the tools and the components. A leaf module: nothing here imports
    anything of the app, so any module may read it at its top level - the
    shape modules import the tools and the tools import the shapes, and a
    constant read while that cycle is being evaluated would not be there yet.
*/

/** The size of a pill before it is measured; its minimum afterwards (see `index.css`). */
export const NODE_SIZE = { width: 160, height: 40 };
/** The radius of the corners of a step - a box (`.pill` in `index.css`); the other pills are round by half their height. */
export const STEP_RADIUS = 4;
/** The start and the ends of the diagram are circles. */
export const TERMINAL_SIZE = { width: 52, height: 52 };
/** The add button below a leaf of the tree, the same square as the insert button of a link. */
export const ADD_BUTTON_SIZE = { width: 18, height: 18 };
export const INSERT_BUTTON_SIZE = 18;
/** The drop points - the add and insert buttons that can take the moved subtree - grow to this while a move is on: easier to hit. */
export const DROP_POINT_SIZE = 20;
/**
 * How far from its target the insert button of a link sits when something is
 * in the way below the source (see `getInsertButtonPoint()`); a layout metric
 * too, as the empty loop is sized around it.
 */
export const INSERT_BUTTON_FROM_TARGET = 30;
/** Vertical distance between a parent and its children; room enough for the insert button of the link between them. */
export const PARENT_GAP = 60;
export const SIBLING_GAP = 24;
/** Horizontal room a group keeps around its content in the tree that contains it. */
export const GROUP_PADDING = 12;

/** The links are drawn below the elements; the return link of a loop below the other links. */
export const BACKWARD_LINK_Z = 0;
export const LINK_Z = 1;
export const ELEMENT_Z = 2;

/**
 * The colors the models, the map and the menus need, as the custom
 * properties of the stylesheet (`index.css`), which defines them for the
 * light and the dark theme: `var()` is a value like any other to an SVG
 * attribute and to the background of the paper, so the picture follows the
 * theme without a rebuild.
 */
export const COLORS = {
    background: 'var(--background)',
    /** The blue of the nodes: the outline of a step, the icons of the menus. */
    node: { stroke: 'var(--blue)' },
    /** The fill of the ends of the diagram and the outline of its start. */
    terminal: 'var(--terminal)',
    /** The pills that steer the flow: a decision, the start of a group. */
    gate: { fill: 'var(--blue)' },
    link: 'var(--link)',
    /** What is about to move, in the menus - the teal of the drop points and of the marks on the cells. */
    move: 'var(--teal)',
    /** The steps on the map: a lighter blue. */
    mapStep: 'var(--map-step)'
};

/**
 * What a group stands in for: a fork/join of any number of branches, or a
 * loop whose return path climbs back from the end to the start.
 */
export type GroupKind = 'fork' | 'loop';

/** The label of the start node of a group. */
export const GROUP_LABELS: Record<GroupKind, string> = {
    fork: 'Fork',
    loop: 'Loop'
};
export const DECISION_LABEL = 'Decision';

/**
 * The icon next to the label of the start of a group, drawn the way the
 * diagram draws the group itself: a fork is a stem that splits over a bar
 * into two drops with arrowheads; a loop is a circuit that runs down on the
 * right and back up on the left, with an arrowhead on the way back.
 */
export const GROUP_ICONS: Record<GroupKind, string> = {
    fork: 'M 0 -8 V -3 M -5 -3 H 5 M -5 -3 V 7 M 5 -3 V 7 M -7.5 4.5 L -5 7 L -2.5 4.5 M 2.5 4.5 L 5 7 L 7.5 4.5',
    loop: 'M -2 -6 H 6 V 6 H -6 V -1 M -8.5 1.5 L -6 -1 L -3.5 1.5'
};
/** The diamond of a flowchart decision. */
export const DECISION_ICON = 'M 0 -7 L 7 0 L 0 7 L -7 0 Z';
/** A card with two lines: a step. */
export const NODE_ICON = 'M -6 -6 H 6 V 6 H -6 Z M -3 -2 H 3 M -3 2 H 3';

/**
 * The trigger of the flow, on the start: an icon per event of a CI file -
 * a push, a pull request, a schedule - and a bolt for anything else.
 * 12px paths centered on the origin.
 */
export const TRIGGER_ICONS: Record<string, string> = {
    push: 'M -3 -5 V 5 M -3 -1 C -3 -3 1 -3 3 -3 M 3 -5 V -3 M -5 -5 A 2 2 0 1 0 -1 -5 A 2 2 0 1 0 -5 -5 M -5 5 A 2 2 0 1 0 -1 5 A 2 2 0 1 0 -5 5 M 1 -5 A 2 2 0 1 0 5 -5 A 2 2 0 1 0 1 -5',
    pull_request: 'M -3 -3 V 5 M 3 -1 V 5 M -3 -3 H 1 L 3 -1 M -5 -3 A 2 2 0 1 0 -1 -3 A 2 2 0 1 0 -5 -3 M -5 5 A 2 2 0 1 0 -1 5 A 2 2 0 1 0 -5 5 M 1 5 A 2 2 0 1 0 5 5 A 2 2 0 1 0 1 5',
    schedule: 'M 0 0 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 M 0 -3 V 0 H 2.5',
    default: 'M 1 -6 L -3 1 H 0 L -1 6 L 3 -1 H 0 Z'
};

/** The icon of a trigger: by the event named first (`schedule: "0 6 * * 1"` is a schedule). */
export function getTriggerIcon(on: string): string {
    const event = on.trim().split(/[\s:,]/)[0];
    return TRIGGER_ICONS[event] ?? TRIGGER_ICONS.default;
}
