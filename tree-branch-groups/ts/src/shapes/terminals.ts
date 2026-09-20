import { dia, util } from '@joint/plus';

import { COLORS, ELEMENT_Z, TERMINAL_SIZE } from './constants';

/*
    The terminals: the start and the ends of the diagram are circles with
    their label inside - the start white with a dark outline and a dark
    label, an end filled dark with a light label.
*/

const terminalMarkup = util.svg/* xml */`
    <circle @selector="body"/>
    <text @selector="label"/>
`;

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
                fontFamily: 'sans-serif',
                fontSize: 12,
                fontWeight: 600,
                fill: colors.text
            }
        }
    }, superDefaults);
}

/** The start of the diagram, its root: a white circle with a dark outline. */
export class StartModel extends dia.Element {

    preinitialize() {
        this.markup = terminalMarkup;
    }

    defaults() {
        return terminalDefaults('tbg.Start', 'Start', { fill: COLORS.node.fill, stroke: COLORS.terminal, text: COLORS.terminal }, super.defaults);
    }

    static create(): StartModel {
        return new StartModel();
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
        return terminalDefaults('tbg.End', 'End', { fill: COLORS.terminal, stroke: COLORS.terminal, text: COLORS.gate.text }, super.defaults);
    }

    static create(): EndModel {
        return new EndModel();
    }

    static isEnd(cell: dia.Cell): cell is EndModel {
        return cell instanceof EndModel;
    }
}
