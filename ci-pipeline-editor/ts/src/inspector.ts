import { ui, util } from '@joint/plus';
import type { dia } from '@joint/plus';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';

import { getEdges } from './data/diagram-data';
import type { DiagramData } from './data/diagram-data';
import type { NodeData, Slot } from './data/types';
import { toYAML } from './data/yaml';
import { DecisionModel, EndModel, GROUP_LABELS, GroupStartModel, StartModel, StepModel } from './shapes';
import { getId } from './data/build';

/** What can be selected: every element with a picture - not the end of a group, not an add button. */
export type Selectable = StepModel | DecisionModel | StartModel | EndModel | GroupStartModel;

export function isSelectable(cell: dia.Cell): cell is Selectable {
    return StepModel.isStep(cell) || DecisionModel.isDecision(cell) || StartModel.isStart(cell) || EndModel.isEnd(cell) || GroupStartModel.isGroupStart(cell);
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
/** The command a step runs: code below its label, on as many lines as typed. */
const RUN_INPUT = { type: 'textarea', label: 'Run', index: 2 };
/** A comment on a node: shown in the YAML above it, nowhere on the diagram. */
const COMMENT_INPUT = { type: 'textarea', label: 'Comment', index: 9 };

/**
 * One text input per option of `node` - a child of a decision, a branch of
 * a fork - for its name, which lives on the edge into it, in the list of
 * the parent: the path of the input is `<slot>/<index>/name`. Labelled
 * `Option 1`, ... or `Branch 1`, ..., like the unnamed options are on the
 * links; an empty field leaves the option to its default name.
 */
function getOptionInputs(node: NodeData, slot: Slot): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    const word = slot === 'to' ? 'Option' : 'Branch';
    getEdges(node, slot).forEach((_edge, index) => {
        inputs[index] = { name: { type: 'text', label: `${word} ${index + 1}`, index: 10 + index }};
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
    const id = getId(element);
    if (GroupStartModel.isGroupStart(element)) {
        const groupId = getId(element.getParentCell()!);
        const kind = element.getKind();
        if (kind === 'loop') return { title: GROUP_LABELS.loop, inputs: { [groupId]: { comment: COMMENT_INPUT }}};
        return { title: GROUP_LABELS.fork, inputs: { [groupId]: { comment: COMMENT_INPUT, ...getOptionInputs(data.getNode(groupId)!, 'branches') }}};
    }
    if (DecisionModel.isDecision(element)) {
        return { title: 'Decision', inputs: { [id]: { label: LABEL_INPUT, comment: COMMENT_INPUT, ...getOptionInputs(data.getNode(id)!, 'to') }}};
    }
    if (StartModel.isStart(element)) return { title: 'Start', inputs: {}, note: 'Where the flow begins. Nothing to edit.' };
    if (EndModel.isEnd(element)) return { title: 'End', inputs: {}, note: 'Where a path of the flow ends. Nothing to edit.' };
    return { title: 'Step', inputs: { [id]: { label: LABEL_INPUT, run: RUN_INPUT, comment: COMMENT_INPUT }}};
}

/**
 * The open inspector, what it was opened for and what the panel shows.
 * Managed here rather than through `ui.Inspector.create()`: that keeps one
 * instance per model, and every node is edited on the same model - the
 * data - under a path of its own.
 */
let inspector: ui.Inspector | null = null;
/** The id of the element the inspector is open for. */
let openId: string | null = null;
/** What the panel shows - the inspector of an element, or the text of the diagram - to leave it alone when asked for the same; `undefined` before the first sync. */
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
hljs.registerLanguage('json', json);

/** The two views of the diagram as text, with nothing selected: the YAML, and the data as JSON. */
type CodeTab = 'yaml' | 'json';
const CODE_TABS: { tab: CodeTab; label: string }[] = [{ tab: 'yaml', label: 'YAML' }, { tab: 'json', label: 'JSON' }];
/** The tab shown; it stays as chosen through the edits and the selections. */
let codeTab: CodeTab = 'yaml';

/** The diagram as text on the chosen tab: the YAML of the flow, or the data as JSON; highlighted by highlight.js (its core and the two grammars only). */
function renderCode(data: DiagramData): HTMLElement {
    const pre = document.createElement('pre');
    pre.className = `code ${codeTab}`;
    const text = codeTab === 'yaml' ? toYAML(data.getData()) : JSON.stringify(data.getData(), null, 2);
    // The text is the emitter's own; the markup is highlight.js's, escaped.
    pre.innerHTML = hljs.highlight(text, { language: codeTab }).value;
    return pre;
}

/** Fills the panel with the tabs and the text of the chosen one; a click on a tab switches and renders again. */
function renderCodePanel(container: HTMLElement, data: DiagramData): void {
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    for (const { tab, label } of CODE_TABS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = tab === codeTab ? 'tab active' : 'tab';
        button.textContent = label;
        button.addEventListener('click', () => {
            if (tab === codeTab) return;
            codeTab = tab;
            renderCodePanel(container, data);
        });
        tabs.append(button);
    }
    container.replaceChildren(tabs, renderCode(data));
}

/** Whether a sync is under way, and the one asked for meanwhile - by the rebuild a commit triggers - to run after it. */
let syncing = false;
let pending: [HTMLElement, DiagramData, Selectable | null] | null = null;

/**
 * Shows `element` in the panel - or the diagram as YAML, with nothing
 * selected, kept up to date with the data. The inspector edits the data,
 * not the graph: its inputs are bound to the fields of the node the
 * element stands for - the label of a step or a decision, the command a
 * step runs, the comment of a node, the names of the options of a decision
 * or a fork - and a change is one edit of the data like any other:
 * recorded by the history, followed by a rebuild of the graph. Called after
 * every change of the selection and after every rebuild: the inspector is
 * replaced when its set of inputs changes - an option added or removed -
 * and left alone otherwise, so that a change of a value keeps it. What is
 * typed is saved before the panel is replaced: a field left by a click on
 * the paper never loses its focus, so its change is never committed on its
 * own. The rebuild that a save triggers asks for a sync in turn; that one
 * waits until this one is done.
 */
export function syncInspector(container: HTMLElement, data: DiagramData, element: Selectable | null): void {
    if (syncing) {
        pending = [container, data, element];
        return;
    }
    syncing = true;
    try {
        sync(container, data, element);
    } finally {
        syncing = false;
    }
    if (pending) {
        const [nextContainer, nextData, nextElement] = pending;
        pending = null;
        syncInspector(nextContainer, nextData, nextElement);
    }
}

function sync(container: HTMLElement, data: DiagramData, element: Selectable | null): void {
    const id = element ? getId(element) : null;
    // The panel moves on to another element: what is typed is saved, and the signature is computed on the saved data.
    if (inspector && id !== openId) closeInspector(data);
    const config = element ? getConfig(data, element) : null;
    const nextSignature = config ? JSON.stringify([id, config.title, config.inputs]) : toYAML(data.getData());
    if (nextSignature === signature) return;
    signature = nextSignature;
    // The same element with other inputs - an option added or removed: what is typed is saved too.
    closeInspector(data);
    if (!config) {
        renderCodePanel(container, data);
    } else if (config.note !== undefined) {
        renderPanel(container, config.title, config.note);
    } else {
        inspector = new ui.Inspector({ cell: data, inputs: config.inputs });
        openId = id;
        const el = inspector.render().el;
        // `Escape` in a field leaves the field - and so commits it; the keyboard of the diagram does not listen inside fields.
        el.addEventListener('keydown', (evt: KeyboardEvent) => {
            if (evt.key === 'Escape' && evt.target instanceof HTMLElement) evt.target.blur();
        });
        renderPanel(container, config.title, el);
    }
}

/**
 * Saves what is typed in the open inspector and takes it down. Only the
 * fields whose value differs from the data are committed, each through the
 * data's own method - an empty field takes the value out, where
 * `updateCell()` would write an empty string - as one edit each.
 */
function closeInspector(data: DiagramData): void {
    if (!inspector) return;
    const open = inspector;
    inspector = null;
    openId = null;
    for (const field of Array.from(open.el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-attribute]'))) {
        const path = field.dataset.attribute!;
        const current = util.getByPath(data.getData(), path, '/') as string | undefined;
        if (field.value !== (current ?? '')) commit(data, path, field.value);
    }
    open.remove();
}

/** Writes `value` at `path` - `<id>/<field>`, or `<id>/<slot>/<index>/name` for the name of an option - into the data. */
function commit(data: DiagramData, path: string, value: string): void {
    const [id, ...rest] = path.split('/');
    if (rest.length === 3 && rest[2] === 'name') {
        data.setOptionName(id, rest[0] as Slot, Number(rest[1]), value || null);
    } else {
        data.changeNode(id, { [rest[0]]: value } as Partial<NodeData>);
    }
}
