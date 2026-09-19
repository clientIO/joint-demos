import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { getEdges } from './data/DiagramData';
import type { NodeData, Slot } from './data/types';
import { toYAML } from './data/yaml';
import { useEditor } from './editor-context';
import { GROUP_LABELS, GroupStart } from './shapes';

hljs.registerLanguage('yaml', yaml);

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
    const onKeyDown = (evt: React.KeyboardEvent<HTMLElement>): void => {
        if (evt.key === 'Escape') (evt.currentTarget as HTMLElement).blur();
    };
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            {multiline ? (
                <textarea value={draft} onChange={(evt) => setDraft(evt.target.value)} onBlur={commit} onKeyDown={onKeyDown} />
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
                    label={`Option ${index + 1}`}
                    value={edge.name ?? ''}
                    onCommit={(name) => editor.data.setOptionName(id, slot, index, name || null)}
                />
            ))}
        </div>
    );
}

/** The fields of the selected element: what the data holds about the node it stands for. */
function NodeFields({ id }: { id: string }): ReactNode {
    const editor = useEditor();
    const { data, graph } = editor;
    const element = graph.getCell(id);
    // The start of a group stands for the group.
    const nodeId = element && GroupStart.isGroupStart(element) ? String(element.getParentCell()!.id) : id;
    const node = data.getNode(nodeId);
    if (!node) return null;
    const change = (fields: Partial<NodeData>): void => data.changeNode(nodeId, fields);

    switch (node.type) {
        case 'step':
            return (
                <>
                    <div className="title">Step</div>
                    <Field label="Label" value={node.label} multiline onCommit={(label) => change({ label })} />
                    <Field label="Run" value={node.run ?? ''} code onCommit={(run) => change({ run: run || undefined })} />
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
                    <Field label="Comment" value={node.comment ?? ''} multiline onCommit={(comment) => change({ comment: comment || undefined })} />
                    {node.type === 'fork' ? <OptionFields id={nodeId} node={node} slot="branches" heading="Branches" /> : null}
                </>
            );
        case 'start':
            return (
                <>
                    <div className="title">Start</div>
                    <div className="message">Where the flow begins. Nothing to edit.</div>
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

/** The diagram as YAML, highlighted by highlight.js (its YAML grammar only). */
function YamlPanel(): ReactNode {
    const { data } = useEditor();
    // The markup is highlight.js's, escaped. Rendered again with every change of the data (see `Inspector`).
    const html = hljs.highlight(toYAML(data.getData()), { language: 'yaml' }).value;
    return (
        <>
            <div className="title">YAML</div>
            <pre className="yaml" dangerouslySetInnerHTML={{ __html: html }} />
        </>
    );
}

/**
 * The panel on the right: the fields of the selected element - edits of
 * the data, each one undoable step - or, with nothing selected, the diagram
 * as YAML, kept up to date.
 */
export function Inspector(): ReactNode {
    const { selectedId, version } = useEditor();
    return (
        <div className="inspector">
            {selectedId ? <NodeFields key={`${selectedId}-${version}`} id={selectedId} /> : <YamlPanel key={version} />}
        </div>
    );
}
