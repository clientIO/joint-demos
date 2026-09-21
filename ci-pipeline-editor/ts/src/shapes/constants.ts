/*
    The layout metrics, the colors, the icons and the labels shared by the
    shapes, the layout and the tools.
*/

// Layout metrics shared by the shapes and the layout.
export const NODE_SIZE = { width: 160, height: 40 };
/** The radius of the corners of a step - a box; the other pills are round by half their height. */
export const STEP_RADIUS = 4;
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

/**
 * The colors of the shapes, the map and the menus: the custom properties of
 * `styles.css`, defined once per theme - a `var()` is a value like any
 * other to an SVG attribute and to the background of a paper, so the
 * picture follows a switch of the theme without a rebuild.
 */
export const COLORS = {
    background: 'var(--background)',
    node: { fill: 'var(--surface)', stroke: 'var(--blue)', text: 'var(--text)' },
    /** The fills of the start of the diagram and of its ends, and the text on an end; red is kept for what is about to be deleted. */
    terminal: 'var(--terminal)',
    onTerminal: 'var(--on-terminal)',
    /** The pills that steer the flow: a decision, the start of a group. */
    gate: { fill: 'var(--blue)', stroke: 'var(--blue)', text: 'var(--on-blue)' },
    link: 'var(--link)',
    /** What is about to be deleted, in the menus; the stylesheet repeats it for the preview on the cells. */
    danger: 'var(--red)',
    /** What is about to move, in the menus - the teal of the drop points; the stylesheet repeats it for the marks on the cells. */
    move: 'var(--teal)',
    /** The add buttons: the blue of the nodes, marked in white, outlined in the color of the surface they sit on - the one at the end of a pill in what sets it off the pill. */
    button: { fill: 'var(--blue)', text: 'var(--on-blue)', outline: 'var(--surface)', pillOutline: 'var(--pill-add-outline)' },
    /** The collapse/expand button of a group: a disc in the color of the text on a pill, outlined in the deeper blue. */
    toggle: { outline: 'var(--blue-deep)' },
    /** The code on a step - the command it runs - on a chip: its programs in the stronger blue, its flags muted. */
    code: { chip: 'var(--chip)', text: 'var(--chip-text)', command: 'var(--blue-dark)', flag: 'var(--chip-flag)' },
    /** The labels on the flow - the names of the options, the trigger of the flow on the start - amber on a tinted chip, so that they stand out from the blue of the nodes and the lines. */
    option: { fill: 'var(--option-chip)', text: 'var(--option-text)' },
    /** The frame around the selected element: the teal of the move, a color of its own next to the blue of the nodes. */
    selection: 'var(--selection)'
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
