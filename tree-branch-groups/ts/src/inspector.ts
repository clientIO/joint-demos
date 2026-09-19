import { ui } from '@joint/plus';
import type { dia } from '@joint/plus';

import { getEdges } from './data/DiagramData';
import type { DiagramData } from './data/DiagramData';
import type { NodeData, Slot } from './data/types';
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
        if (kind === 'loop') return { title: GROUP_LABELS.loop, inputs: {}, note: 'Runs its body until the flow leaves it. Nothing to edit.' };
        return { title: GROUP_LABELS.fork, inputs: { [groupId]: getOptionInputs(data.getNode(groupId)!, 'branches') }};
    }
    if (Decision.isDecision(element)) {
        return { title: 'Decision', inputs: { [id]: { label: LABEL_INPUT, ...getOptionInputs(data.getNode(id)!, 'to') }}};
    }
    if (Start.isStart(element)) return { title: 'Start', inputs: {}, note: 'Where the flow begins. Nothing to edit.' };
    if (End.isEnd(element)) return { title: 'End', inputs: {}, note: 'Where a path of the flow ends. Nothing to edit.' };
    return { title: 'Step', inputs: { [id]: { label: LABEL_INPUT }}};
}

/**
 * The open inspector, and what it was opened for. Managed here rather than
 * through `ui.Inspector.create()`: that keeps one instance per model, and
 * every node is edited on the same model - the data - under a path of its
 * own.
 */
let inspector: ui.Inspector | null = null;
/** What the panel shows, to leave it alone when asked for the same; `undefined` before the first sync. */
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

/**
 * Shows `element` in the panel - or the hint, with nothing selected. The
 * inspector edits the data, not the graph: its inputs are bound to the
 * fields of the node the element stands for - the label of a step or a
 * decision, the names of the options of a decision or a fork - and a change is one edit of the data like any other:
 * recorded by the history, followed by a rebuild of the graph. Called after
 * every change of the selection and after every rebuild: the inspector is
 * replaced when its set of inputs changes - an option added or removed -
 * and left alone otherwise, so that a change of a value keeps it.
 */
export function syncInspector(container: HTMLElement, data: DiagramData, element: Selectable | null): void {
    const config = element ? getConfig(data, element) : null;
    const nextSignature = config ? JSON.stringify([element!.id, config.title, config.inputs]) : null;
    if (nextSignature === signature) return;
    signature = nextSignature;
    inspector?.remove();
    inspector = null;
    if (!config) {
        renderPanel(container, null, 'Select an element to inspect it.');
    } else if (config.note !== undefined) {
        renderPanel(container, config.title, config.note);
    } else {
        inspector = new ui.Inspector({ cell: data, inputs: config.inputs });
        renderPanel(container, config.title, inspector.render().el);
    }
}
