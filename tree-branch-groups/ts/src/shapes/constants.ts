/*
    The layout metrics, the colors, the icons and the labels shared by the
    shapes, the layout and the tools.
*/

// Layout metrics shared by the shapes and the layout.
export const NODE_SIZE = { width: 160, height: 40 };
/** The end of a group has no size: it is the point the paths of the group converge into. */
export const GROUP_END_SIZE = { width: 0, height: 0 };
/** The start and the ends of the diagram are circles. */
export const TERMINAL_SIZE = { width: 52, height: 52 };
/** The add button below a leaf of the tree, the same square as the insert button of a link. */
export const ADD_BUTTON_SIZE = { width: 18, height: 18 };
/**
 * How far from its target the insert button of a link sits when something is
 * in the way below the source (see `placeLinkTools()`); a layout metric too,
 * as the empty loop is sized around it.
 */
export const INSERT_BUTTON_FROM_TARGET = 30;
/** The plus of every add button: the ones on the pills, the ones below the leaves, the insert buttons of the links, the expand button of a collapsed group. */
export const PLUS_ICON = 'M -4 0 4 0 M 0 -4 0 4';
/** Vertical distance between a parent and its children; room enough for the insert button of the link between them. */
export const PARENT_GAP = 60;
export const SIBLING_GAP = 24;
/** Horizontal room a group keeps around its content in the tree that contains it. */
export const GROUP_PADDING = 12;

/** The links are drawn below the elements; the return link of a loop below the other links. */
export const BACKWARD_LINK_Z = 0;
export const LINK_Z = 1;
export const ELEMENT_Z = 2;

export const COLORS = {
    background: '#F3F7F6',
    node: { fill: '#FFFFFF', stroke: '#4666E5', text: '#222222' },
    /** The fills of the start of the diagram and of its ends; red is kept for what is about to be deleted. */
    terminal: '#2B3555',
    /** The pills that steer the flow: a decision, the start of a group. */
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    link: '#7A90EC',
    /** What is about to be deleted, in the menus; the stylesheet repeats it for the preview on the cells. */
    danger: '#E54666',
    /** What is about to move, in the menus - the teal of the drop points; the stylesheet repeats it for the marks on the cells. */
    move: '#2F9C95',
    /** The add buttons: the blue of the nodes, marked in white. */
    button: { fill: '#4666E5', text: '#FFFFFF' },
    /** The frame around the selected element: a shade darker than the nodes. */
    selection: '#3552C4'
};

/**
 * What a group stands in for: a fork/join of any number of branches, or a loop whose
 * return path climbs back from the end to the start.
 */
export type GroupKind = 'fork' | 'loop';

/** The label of the start node of a group. */
export const GROUP_LABELS: Record<GroupKind, string> = {
    fork: 'Fork',
    loop: 'Loop'
};
export const DECISION_LABEL = 'Decision';

/** The selector of the add button at the right end of a decision or the start of a fork; a click on it is recognized by it. */
export const ADD_BUTTON_SELECTOR = 'addButton';

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

/** Custom paper event triggered by the collapse/expand button on the start of a group. */
export const TOGGLE_EVENT = 'element:group:toggle';
