import { ui } from '@joint/plus';
import type { dia } from '@joint/plus';
import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';

import { getEdges } from './data/DiagramData';
import type { DiagramData } from './data/DiagramData';
import type { NodeData, Slot } from './data/types';
import { toYAML } from './data/yaml';
import { Decision, End, GROUP_LABELS, GroupStart, Start, Step } from './shapes';

/** What can be selected: every element with a picture - not the end of a group, not an add button. */
export type Selectable = Step | Decision | Start | End | GroupStart;

export function isSelectable(cell: dia.Cell): cell is Selectable {
    return Step.isStep(cell) || Decision.isDecision(cell) || Start.isStart(cell) || End.isEnd(cell) || GroupStart.isGroupStart(cell);
}

interface InspectorConfig {
    title: string;
    /** The inputs of the inspector, by the path of the field of the data they edit; empty for an element with nothing to edit. */
    inputs: Record<string, unknown>;
    /** What the panel says instead, when there is nothing to edit. */
    note?: string;
}

/** A text area: a newline in the label breaks a line on the pill. */
const LABEL_INPUT = { type: 'textarea', label: 'Label', index: 1 };
/** The command a step runs: a line of code below its label. */
const RUN_INPUT = { type: 'text', label: 'Run', index: 2 };
/** A comment on a node: shown in the YAML above it, nowhere on the diagram. */
const COMMENT_INPUT = { type: 'textarea', label: 'Comment', index: 9 };

/**
 * One text input per option of `node` - a child of a decision, a branch of
 * a fork - for its name, which lives on the edge into it, in the list of
 * the parent: the path of the input is `<slot>/<index>/name`. Numbered like
 * the unnamed options are on the links.
 */
function getOptionInputs(node: NodeData, slot: Slot): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    getEdges(node, slot).forEach((_edge, index) => {
        inputs[index] = { name: { type: 'text', label: `Option ${index + 1}`, index: 10 + index }};
    });
    return { [slot]: inputs };
}

/**
 * The inspector of `element`: the fields of the node of the data it stands
 * for - the group, for the start of a group. A decision and a fork edit
 * the names of their options; the collapse button on the pill is the
 * only way to collapse a group.
 */
function getConfig(data: DiagramData, element: Selectable): InspectorConfig {
    const id = String(element.id);
    if (GroupStart.isGroupStart(element)) {
        const groupId = String(element.getParentCell()!.id);
        const kind = element.getKind();
        if (kind === 'loop') return { title: GROUP_LABELS.loop, inputs: { [groupId]: { comment: COMMENT_INPUT }}};
        return { title: GROUP_LABELS.fork, inputs: { [groupId]: { comment: COMMENT_INPUT, ...getOptionInputs(data.getNode(groupId)!, 'branches') }}};
    }
    if (Decision.isDecision(element)) {
        return { title: 'Decision', inputs: { [id]: { label: LABEL_INPUT, comment: COMMENT_INPUT, ...getOptionInputs(data.getNode(id)!, 'to') }}};
    }
    if (Start.isStart(element)) return { title: 'Start', inputs: {}, note: 'Where the flow begins. Nothing to edit.' };
    if (End.isEnd(element)) return { title: 'End', inputs: {}, note: 'Where a path of the flow ends. Nothing to edit.' };
    return { title: 'Step', inputs: { [id]: { label: LABEL_INPUT, run: RUN_INPUT, comment: COMMENT_INPUT }}};
}

/**
 * The open inspector, and what it was opened for. Managed here rather than
 * through `ui.Inspector.create()`: that keeps one instance per model, and
 * every node is edited on the same model - the data - under a path of its
 * own.
 */
let inspector: ui.Inspector | null = null;
/** What the panel shows - the inspector of an element, or the YAML - to leave it alone when asked for the same; `undefined` before the first sync. */
let signature: string | null | undefined;

/** Fills the panel: a header and a body - the hint, a note, or the inspector. */
function renderPanel(container: HTMLElement, title: string | null, body: string | HTMLElement): void {
    const header = document.createElement('div');
    header.className = 'title';
    header.textContent = title ?? '';
    header.hidden = title === null;
    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = typeof body === 'string' ? body : '';
    container.replaceChildren(header, typeof body === 'string' ? message : body);
}

hljs.registerLanguage('yaml', yaml);

/** The diagram as YAML, highlighted by highlight.js (its YAML grammar only), for the panel with nothing selected. */
function renderYAML(data: DiagramData): HTMLElement {
    const pre = document.createElement('pre');
    pre.className = 'yaml';
    // The text is the emitter's own; the markup is highlight.js's, escaped.
    pre.innerHTML = hljs.highlight(toYAML(data.getData()), { language: 'yaml' }).value;
    return pre;
}

/**
 * Shows `element` in the panel - or the diagram as YAML, with nothing
 * selected, kept up to date with the data. The
 * inspector edits the data, not the graph: its inputs are bound to the
 * fields of the node the element stands for - the label of a step or a
 * decision, the command a step runs, the comment of a node, the names of
 * the options of a decision or a fork - and a change is one edit of the data like any other:
 * recorded by the history, followed by a rebuild of the graph. Called after
 * every change of the selection and after every rebuild: the inspector is
 * replaced when its set of inputs changes - an option added or removed -
 * and left alone otherwise, so that a change of a value keeps it.
 */
export function syncInspector(container: HTMLElement, data: DiagramData, element: Selectable | null): void {
    const config = element ? getConfig(data, element) : null;
    const nextSignature = config ? JSON.stringify([element!.id, config.title, config.inputs]) : toYAML(data.getData());
    if (nextSignature === signature) return;
    signature = nextSignature;
    inspector?.remove();
    inspector = null;
    if (!config) {
        renderPanel(container, 'YAML', renderYAML(data));
    } else if (config.note !== undefined) {
        renderPanel(container, config.title, config.note);
    } else {
        inspector = new ui.Inspector({ cell: data, inputs: config.inputs });
        renderPanel(container, config.title, inspector.render().el);
    }
}
