import { dia, util } from '@joint/plus';

import { COLORS, ELEMENT_Z, TERMINAL_SIZE, getTriggerIcon } from './constants';
import { LABEL_FONT_FAMILY, measureText } from './pill';

/*
    The terminals: the start and the ends of the diagram are circles with
    their label inside - the start white with a dark outline and a dark
    label, an end filled dark with a light label. The start may carry the
    trigger of the flow on a chip at its right, `On <event>` - outside of its
    box, which the layout and the links go by, so that it takes no room in
    the tree.
*/

const terminalMarkup = util.svg/* xml */`
    <circle @selector="body"/>
    <text @selector="label"/>
`;
const startMarkup = util.svg/* xml */`
    <circle @selector="body"/>
    <text @selector="label"/>
    <rect @selector="triggerChip"/>
    <path @selector="triggerIcon"/>
    <text @selector="triggerText"/>
`;

/** The chip of the trigger: its gap from the circle, its padding, the room of the icon, its font. */
const TRIGGER_GAP = 8;
const TRIGGER_CHIP = { paddingX: 7, height: 20, radius: 4, iconRoom: 18 };
const TRIGGER_FONT_SIZE = 11;
const TRIGGER_FONT = `600 ${TRIGGER_FONT_SIZE}px ${LABEL_FONT_FAMILY}`;

function terminalDefaults(type: string, label: string, colors: { fill: string; stroke: string; text: string }, superDefaults: object): object {
    return util.defaultsDeep({
        type,
        z: ELEMENT_Z,
        size: TERMINAL_SIZE,
        attrs: {
            body: {
                cx: 'calc(w / 2)',
                cy: 'calc(h / 2)',
                r: 'calc(w / 2)',
                fill: colors.fill,
                stroke: colors.stroke,
                strokeWidth: 1.5
            },
            label: {
                text: label,
                x: 'calc(w / 2)',
                y: 'calc(h / 2)',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
                fontFamily: LABEL_FONT_FAMILY,
                fontSize: 12,
                fontWeight: 600,
                fill: colors.text
            }
        }
    }, superDefaults);
}

/** The start of the diagram, its root: a white circle with a dark outline, and the trigger of the flow on a chip at its right, if it names one. */
export class StartModel extends dia.Element {

    preinitialize() {
        this.markup = startMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            attrs: {
                triggerChip: { display: 'none', x: `calc(w + ${TRIGGER_GAP})`, y: `calc(h / 2 - ${TRIGGER_CHIP.height / 2})`, height: TRIGGER_CHIP.height, rx: TRIGGER_CHIP.radius, ry: TRIGGER_CHIP.radius, fill: COLORS.option.fill, pointerEvents: 'none' },
                triggerIcon: { display: 'none', stroke: COLORS.option.text, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', pointerEvents: 'none' },
                triggerText: {
                    display: 'none',
                    x: `calc(w + ${TRIGGER_GAP + TRIGGER_CHIP.paddingX + TRIGGER_CHIP.iconRoom})`,
                    y: 'calc(h / 2)',
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    fontFamily: LABEL_FONT_FAMILY,
                    fontSize: TRIGGER_FONT_SIZE,
                    fontWeight: 600,
                    fill: COLORS.option.text,
                    pointerEvents: 'none'
                }
            }
        }, terminalDefaults('tbg.Start', 'Start', { fill: COLORS.node.fill, stroke: COLORS.terminal, text: COLORS.terminal }, super.defaults));
    }

    static create(on?: string): StartModel {
        const start = new StartModel();
        start.setTrigger(on);
        return start;
    }

    /** The trigger of the flow, if the start names one. */
    getTrigger(): string | undefined {
        return this.get('trigger');
    }

    /** Shows the trigger `on` on the chip at the right of the circle - the icon of its event, `On`, its text in bold - or, with none, no chip. */
    setTrigger(on: string | undefined): void {
        this.set('trigger', on);
        if (!on) {
            this.attr({ triggerChip: { display: 'none' }, triggerIcon: { display: 'none' }, triggerText: { display: 'none' }});
            return;
        }
        const text = `On ${on}`;
        // The padding, the icon, the text, the padding.
        const width = TRIGGER_CHIP.paddingX + TRIGGER_CHIP.iconRoom + Math.ceil(measureText(text, TRIGGER_FONT)) + TRIGGER_CHIP.paddingX;
        this.attr({
            triggerChip: { display: 'inline', width },
            triggerIcon: { display: 'inline', d: getTriggerIcon(on), transform: `translate(calc(w + ${TRIGGER_GAP + TRIGGER_CHIP.paddingX + TRIGGER_CHIP.iconRoom / 2 - 1}), calc(h / 2))` },
            // `On` light, the event bold.
            triggerText: { display: 'inline', text, annotations: [{ start: 0, end: 2, attrs: { fontWeight: 400 }}] }
        });
    }

    static isStart(cell: dia.Cell): cell is StartModel {
        return cell instanceof StartModel;
    }
}

/** An end of the diagram: a dark circle, a leaf nothing can follow. */
export class EndModel extends dia.Element {

    preinitialize() {
        this.markup = terminalMarkup;
    }

    defaults() {
        return terminalDefaults('tbg.End', 'End', { fill: COLORS.terminal, stroke: COLORS.terminal, text: COLORS.onTerminal }, super.defaults);
    }

    static create(): EndModel {
        return new EndModel();
    }

    static isEnd(cell: dia.Cell): cell is EndModel {
        return cell instanceof EndModel;
    }
}
