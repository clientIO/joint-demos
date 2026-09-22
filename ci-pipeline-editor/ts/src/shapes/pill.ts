import { util } from '@joint/plus';
import type { dia } from '@joint/plus';

import { ADD_BUTTON_SELECTOR, ADD_BUTTON_SIZE, COLORS, DROP_POINT_SIZE, ELEMENT_Z, NODE_SIZE, PLUS_ICON, STEP_RADIUS, TOGGLE_EVENT } from './constants';
import { tokenizeCommand } from './command';

/** The icon sits at the left end of the pill, the label is centered in the rest. */
const KIND_ICON_X = 18;
const KIND_LABEL_OFFSET = 9;
export const LABEL_FONT_FAMILY = 'sans-serif';
const LABEL_FONT_SIZE = 13;
/** The height of a line of a label, as the text is rendered (`lineHeight`). */
const LABEL_LINE_HEIGHT = 1.3 * LABEL_FONT_SIZE;
/**
 * The room a pill keeps around its label: on either side, enough for the
 * icon at the left end or the button at the right end; above and below,
 * enough for a single line to sit in a pill of the minimal size.
 */
const LABEL_PADDING_X = 26;
const LABEL_PADDING_Y = 11;
/** The code below the label of a step - the command it runs: monospaced, a little smaller, tinted. */
const CODE_FONT_FAMILY = 'Menlo, Consolas, monospace';
const CODE_FONT_SIZE = 12;
/** The code sits on a chip: the program in bold, its flags tinted. */
const CODE_COLOR = COLORS.code.text;
const CODE_COMMAND_COLOR = COLORS.code.command;
const CODE_FLAG_COLOR = COLORS.code.flag;
const CODE_CHIP = { fill: COLORS.code.chip, paddingX: 7, height: 17, radius: 4 };
/** A pill with a command is a little taller: room between the label, the chip and the border. */
const CODE_ROOM = 4;
const TOGGLE_RADIUS = 11;
export const COLLAPSE_ICON = 'M -4 0 4 0';
export const EXPAND_ICON = PLUS_ICON;

/*
    The pills: a step, a decision and the start of a group are rounded
    rectangles with an icon at the left end and a label centered in the
    rest. A decision and the start of a fork carry, at the right end, the
    button that adds an option or a branch; the start of a group carries the
    collapse/expand button of the group on its bottom edge. Each class puts
    together the markup it needs from these parts.
*/

/** The chip behind the code of a step that runs a command, and the code on it, under the label, are part of every pill and shown on a step with a command only: a step keeps its view when it gains or loses its command. The code is a text of its own: left-aligned, where the label is centered. */
export const pillMarkup = util.svg/* xml */`
    <rect @selector="body"/>
    <path @selector="kindIcon"/>
    <rect @selector="runChip"/>
    <text @selector="label"/>
    <text @selector="code"/>
`;
/** The ring that pulses behind the add button while the button is a drop point (see the stylesheet); hidden otherwise. */
export const addButtonMarkup = util.svg/* xml */`
    <rect @selector="addPulse" class="pulse"/>
    <rect @selector="addButton"/>
    <path @selector="addIcon"/>
`;
export const toggleMarkup = util.svg/* xml */`
    <circle @selector="toggle"/>
    <path @selector="toggleIcon"/>
`;

const PILL_ATTRS = {
    runChip: { display: 'none' },
    code: {
        display: 'none',
        textAnchor: 'start',
        textVerticalAnchor: 'middle',
        fontFamily: CODE_FONT_FAMILY,
        fontSize: CODE_FONT_SIZE,
        lineHeight: `${LABEL_LINE_HEIGHT}px`,
        fill: CODE_COLOR,
        pointerEvents: 'none'
    },
    body: {
        width: 'calc(w)',
        height: 'calc(h)',
        rx: STEP_RADIUS,
        ry: STEP_RADIUS,
        strokeWidth: 1.5,
        stroke: COLORS.node.stroke,
        fill: COLORS.node.fill
    },
    kindIcon: {
        transform: `translate(${KIND_ICON_X}, calc(h / 2))`,
        stroke: COLORS.node.stroke,
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
        pointerEvents: 'none'
    },
    label: {
        x: `calc(w / 2 + ${KIND_LABEL_OFFSET})`,
        y: 'calc(h / 2)',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
        fontFamily: LABEL_FONT_FAMILY,
        fontSize: LABEL_FONT_SIZE,
        lineHeight: `${LABEL_LINE_HEIGHT}px`,
        fill: COLORS.node.text
    }
};

/** A text annotation of the `text` attribute: a range of the text with attributes of its own. */
interface LabelAnnotation {
    start: number;
    end: number;
    attrs: Record<string, string | number>;
}

const LABEL_FONT = `${LABEL_FONT_SIZE}px ${LABEL_FONT_FAMILY}`;
const CODE_FONT = `${CODE_FONT_SIZE}px ${CODE_FONT_FAMILY}`;

/** A 2D context of an off-screen canvas, for measuring text in the fonts of the labels. */
let measuringContext: CanvasRenderingContext2D | null = null;

/** The width of the widest line of `text` in `font`. */
export function measureText(text: string, font: string): number {
    measuringContext ??= document.createElement('canvas').getContext('2d')!;
    measuringContext.font = font;
    return Math.max(...text.split('\n').map((line) => measuringContext!.measureText(line).width));
}

/**
 * The annotations of a command - one line or several: its programs in
 * bold, its flags tinted (see `command.ts`).
 */
function annotateCommand(code: string): LabelAnnotation[] {
    const annotations: LabelAnnotation[] = [];
    let position = 0;
    for (const token of tokenizeCommand(code)) {
        const start = position;
        position += token.text.length;
        if (token.kind === 'cmd') annotations.push({ start, end: position, attrs: { fontWeight: 600, fill: CODE_COMMAND_COLOR }});
        if (token.kind === 'flag') annotations.push({ start, end: position, attrs: { fill: CODE_FLAG_COLOR }});
    }
    return annotations;
}

/**
 * Sets the text of a pill - its label, centered, and below it its code, if
 * any: the command a step runs, monospaced, a little smaller, on a chip,
 * left-aligned, its programs and flags marked through annotations - and
 * sizes the pill to it: the size of a node at least, wider for a long line
 * and taller for several (a newline breaks a line, in the label and in the
 * command alike). Each part is measured in its own font. The lines of both
 * are stacked and centered on the pill as one block.
 */
export function setPillLabel(pill: dia.Element, label: string, code?: string): void {
    const labelLines = label.split('\n').length;
    const codeLines = code ? code.split('\n').length : 0;
    // The label's block sits above the middle by half the code's block.
    pill.attr('label', { text: label, y: `calc(h / 2 - ${codeLines * LABEL_LINE_HEIGHT / 2})` });
    if (code) {
        // The code's block sits below the middle by half the label's block; the chip is drawn around it.
        const codeCenterOffset = labelLines * LABEL_LINE_HEIGHT / 2;
        const codeWidth = Math.ceil(measureText(code, CODE_FONT)) + 2 * CODE_CHIP.paddingX;
        const chipX = `calc(w / 2 + ${KIND_LABEL_OFFSET - codeWidth / 2})`;
        pill.attr('runChip', {
            display: 'inline',
            x: chipX,
            y: `calc(h / 2 + ${codeCenterOffset - (CODE_CHIP.height + (codeLines - 1) * LABEL_LINE_HEIGHT) / 2})`,
            width: codeWidth,
            height: CODE_CHIP.height + (codeLines - 1) * LABEL_LINE_HEIGHT,
            rx: CODE_CHIP.radius,
            ry: CODE_CHIP.radius,
            fill: CODE_CHIP.fill
        });
        pill.attr('code', {
            display: 'inline',
            text: code,
            annotations: annotateCommand(code),
            x: `calc(w / 2 + ${KIND_LABEL_OFFSET - codeWidth / 2 + CODE_CHIP.paddingX})`,
            y: `calc(h / 2 + ${codeCenterOffset})`
        });
    } else {
        pill.attr('runChip', { display: 'none' });
        pill.attr('code', { display: 'none' });
    }
    const width = Math.max(measureText(label, LABEL_FONT), code ? measureText(code, CODE_FONT) : 0);
    const lines = labelLines + codeLines;
    pill.resize(
        Math.max(NODE_SIZE.width, Math.ceil(width) + 2 * LABEL_PADDING_X),
        Math.max(NODE_SIZE.height, Math.ceil(lines * LABEL_LINE_HEIGHT) + 2 * LABEL_PADDING_Y + (code ? CODE_ROOM : 0))
    );
}

/** The pills that steer the flow are filled: a decision, the start of a group. */
export const FILLED_PILL_ATTRS = {
    body: { fill: COLORS.gate.fill, stroke: COLORS.gate.stroke, rx: 'calc(h / 2)', ry: 'calc(h / 2)' },
    kindIcon: { stroke: COLORS.gate.text },
    label: { fill: COLORS.gate.text }
};

/**
 * The button that adds a sibling option to a decision, or a branch to a
 * fork: at the right end of the pill, apart from the "add below" and
 * "insert" buttons, which sit on the links. Blue with a white plus, like
 * every add button.
 */
export const ADD_BUTTON_ATTRS = {
    addPulse: {
        display: 'none',
        x: `calc(w - ${ADD_BUTTON_SIZE.width / 2})`,
        y: `calc(h / 2 - ${ADD_BUTTON_SIZE.height / 2})`,
        width: ADD_BUTTON_SIZE.width,
        height: ADD_BUTTON_SIZE.height,
        rx: 3,
        ry: 3
    },
    [ADD_BUTTON_SELECTOR]: {
        x: `calc(w - ${ADD_BUTTON_SIZE.width / 2})`,
        y: `calc(h / 2 - ${ADD_BUTTON_SIZE.height / 2})`,
        width: ADD_BUTTON_SIZE.width,
        height: ADD_BUTTON_SIZE.height,
        rx: 3,
        ry: 3,
        fill: COLORS.button.fill,
        stroke: COLORS.button.pillOutline,
        strokeWidth: 1.5,
        cursor: 'pointer'
    },
    addIcon: {
        d: PLUS_ICON,
        transform: 'translate(calc(w), calc(h / 2))',
        stroke: COLORS.button.text,
        strokeWidth: 2,
        fill: 'none',
        pointerEvents: 'none'
    }
};

/**
 * Makes the add button of `pill` a drop point, or a plain button again: a
 * drop point is drawn larger, around the same center, with the ring that
 * pulses behind it. A hidden button stays hidden, ring included.
 */
export function setDropPoint(pill: dia.Element, active: boolean): void {
    const shown = pill.attr([ADD_BUTTON_SELECTOR, 'display']) !== 'none';
    const size = active ? DROP_POINT_SIZE : ADD_BUTTON_SIZE.width;
    const box = { x: `calc(w - ${size / 2})`, y: `calc(h / 2 - ${size / 2})`, width: size, height: size };
    pill.attr({
        addPulse: { ...box, display: active && shown ? null : 'none' },
        [ADD_BUTTON_SELECTOR]: box,
        addIcon: { transform: `translate(calc(w), calc(h / 2)) scale(${size / ADD_BUTTON_SIZE.width})` }
    });
}

/** Shows or hides the add button of `pill` - the one at its right end. */
export function showAddButton(pill: dia.Element, visible: boolean): void {
    const display = visible ? null : 'none';
    pill.attr({
        [ADD_BUTTON_SELECTOR]: { display },
        addIcon: { display }
    });
    if (!visible) pill.attr('addPulse/display', 'none');
}

/** The collapse/expand button of a group, on the bottom edge of its start. Inverted colors, so that it stands out on the pill. */
export const TOGGLE_ATTRS = {
    toggle: {
        cx: 'calc(w / 2)',
        cy: 'calc(h)',
        r: TOGGLE_RADIUS,
        fill: COLORS.gate.text,
        stroke: COLORS.toggle.outline,
        strokeWidth: 1.5,
        cursor: 'pointer',
        event: TOGGLE_EVENT,
        dataTooltip: 'Collapse'
    },
    toggleIcon: {
        d: COLLAPSE_ICON,
        transform: 'translate(calc(w / 2), calc(h))',
        stroke: COLORS.gate.fill,
        strokeWidth: 2,
        fill: 'none',
        pointerEvents: 'none'
    }
};

/** What every pill shares: the size of a node and the basic attributes; the type and the icon are the subclass's. */
export function pillDefaults(type: string, extra: object, superDefaults: object): object {
    return util.defaultsDeep({ type, z: ELEMENT_Z, size: NODE_SIZE }, extra, { attrs: PILL_ATTRS }, superDefaults);
}
