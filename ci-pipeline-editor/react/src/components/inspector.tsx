import type { dia } from '@joint/plus';
import { useCells, useSelectionCollection } from '@joint/react-plus';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { getId } from '../data/build';
import { getEdges } from '../data/diagram-data';
import type { NodeData, Slot } from '../data/types';
import { toYAML } from '../data/yaml';
import { useEditor } from '../editor-context';
import { GROUP_LABELS, GroupStartModel } from '../shapes';

hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('json', json);

/** The two views of the diagram as text, with nothing selected: the YAML, and the data as JSON. */
type CodeTab = 'yaml' | 'json';
const CODE_TABS: { tab: CodeTab; label: string }[] = [{ tab: 'yaml', label: 'YAML' }, { tab: 'json', label: 'JSON' }];

interface FieldProps {
    label: string;
    value: string;
    multiline?: boolean;
    code?: boolean;
    onCommit: (value: string) => void;
}

/**
 * A field of the inspector: a text input or a text area whose value is
 * committed when it is left - by a click elsewhere, `Tab`, or `Escape`,
 * which leaves it too - and only when it changed. The fields are mounted
 * afresh after every change of the data (see `Inspector`), so what the
 * data holds is what they show.
 */
function Field({ label, value, multiline, code, onCommit }: FieldProps): ReactNode {
    const [draft, setDraft] = useState(value);
    const commit = (): void => {
        if (draft !== value) onCommit(draft);
    };
    const onKeyDown = (evt: KeyboardEvent<HTMLElement>): void => {
        if (evt.key === 'Escape') (evt.currentTarget as HTMLElement).blur();
    };
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            {multiline ? (
                <textarea className={code ? 'code' : undefined} value={draft} onChange={(evt) => setDraft(evt.target.value)} onBlur={commit} onKeyDown={onKeyDown} />
            ) : (
                <input type="text" className={code ? 'code' : undefined} value={draft} onChange={(evt) => setDraft(evt.target.value)} onBlur={commit} onKeyDown={onKeyDown} />
            )}
        </label>
    );
}

/** The name fields of the options of a decision or the branches of a fork, under a heading of their own. */
function OptionFields({ id, node, slot, heading }: { id: string; node: NodeData; slot: Slot; heading: string }): ReactNode {
    const editor = useEditor();
    const edges = getEdges(node, slot);
    if (edges.length === 0) return null;
    return (
        <div className="options">
            <div className="title">{heading}</div>
            {edges.map((edge, index) => (
                <Field
                    key={`${edge.id}-${index}`}
                    label={`${slot === 'to' ? 'Option' : 'Branch'} ${index + 1}`}
                    value={edge.name ?? ''}
                    onCommit={(name) => editor.data.setOptionName(id, slot, index, name || null)}
                />
            ))}
        </div>
    );
}

/** The fields of the selected element: what the data holds about the node it stands for. */
function NodeFields({ id }: { id: dia.Cell.ID }): ReactNode {
    const editor = useEditor();
    const { data, graph } = editor;
    const element = graph.getCell(id);
    if (!element) return null;
    // The start of a group stands for the group.
    const nodeId = GroupStartModel.isGroupStart(element) ? getId(element.getParentCell()!) : getId(element);
    const node = data.getNode(nodeId);
    if (!node) return null;
    const change = (fields: Partial<NodeData>): void => data.changeNode(nodeId, fields);

    switch (node.type) {
        case 'step':
            return (
                <>
                    <div className="title">Step</div>
                    <Field label="Label" value={node.label} multiline onCommit={(label) => change({ label })} />
                    <Field label="Run" value={node.run ?? ''} multiline code onCommit={(run) => change({ run: run || undefined })} />
                    <Field label="Comment" value={node.comment ?? ''} multiline onCommit={(comment) => change({ comment: comment || undefined })} />
                </>
            );
        case 'decision':
            return (
                <>
                    <div className="title">Decision</div>
                    <Field label="Label" value={node.label} multiline onCommit={(label) => change({ label })} />
                    <Field label="Comment" value={node.comment ?? ''} multiline onCommit={(comment) => change({ comment: comment || undefined })} />
                    <OptionFields id={nodeId} node={node} slot="to" heading="Options" />
                </>
            );
        case 'fork':
        case 'loop':
            return (
                <>
                    <div className="title">{GROUP_LABELS[node.type]}</div>
                    {/* The kind of the group stands in until it is given a name, which a collapsed group shows in its place. */}
                    <Field label="Label" value={node.label ?? ''} multiline onCommit={(label) => change({ label: label || undefined })} />
                    <Field label="Comment" value={node.comment ?? ''} multiline onCommit={(comment) => change({ comment: comment || undefined })} />
                    {node.type === 'fork' ? <OptionFields id={nodeId} node={node} slot="branches" heading="Branches" /> : null}
                </>
            );
        case 'start':
            return (
                <>
                    <div className="title">Start</div>
                    <Field label="Trigger" value={node.on ?? ''} code onCommit={(on) => change({ on: on || undefined })} />
                </>
            );
        case 'end':
            return (
                <>
                    <div className="title">End</div>
                    <div className="message">Where a path of the flow ends. Nothing to edit.</div>
                </>
            );
    }
}

/** The diagram as text on the chosen tab - the YAML of the flow, or the data as JSON - highlighted by highlight.js (its core and the two grammars only). */
function CodePanel({ tab, onTab }: { tab: CodeTab; onTab: (tab: CodeTab) => void }): ReactNode {
    const { data } = useEditor();
    const text = tab === 'yaml' ? toYAML(data.getData()) : JSON.stringify(data.getData(), null, 2);
    // The markup is highlight.js's, escaped. Rendered again with every change of the data (see `Inspector`).
    const html = hljs.highlight(text, { language: tab }).value;
    return (
        <>
            <div className="tabs">
                {CODE_TABS.map((item) => (
                    <button key={item.tab} type="button" className={item.tab === tab ? 'tab active' : 'tab'} onClick={() => onTab(item.tab)}>
                        {item.label}
                    </button>
                ))}
            </div>
            <pre className={`code ${tab}`} dangerouslySetInnerHTML={{ __html: html }} />
        </>
    );
}

/**
 * The panel on the right: the fields of the selected element - edits of
 * the data, each one undoable step - or, with nothing selected, the diagram
 * as text, YAML or JSON by the tab, kept up to date. The tab stays as
 * chosen through the edits and the selections.
 */
export function Inspector(): ReactNode {
    const { version } = useEditor();
    const { collection } = useSelectionCollection();
    const selectedId = useCells(collection, (cells) => cells[0]?.id ?? null);
    const [tab, setTab] = useState<CodeTab>('yaml');
    return (
        <div className="inspector">
            {selectedId ? <NodeFields key={`${selectedId}-${version}`} id={selectedId} /> : <CodePanel key={version} tab={tab} onTab={setTab} />}
        </div>
    );
}
