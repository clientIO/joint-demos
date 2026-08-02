import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import type { StateEffect } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import type { CellId } from '@joint/react-plus';
import { flowchartTags, mermaid, mermaidTags } from 'codemirror-lang-mermaid';
import { useEffect, useRef } from 'react';
import {
    firstOccurrence,
    mermaidSelectionHighlight,
    nodeIdsOnCursorLine,
    setHighlightedIds,
} from './editor-highlight';

/**
 * Colours for the Mermaid grammar's own tags. `codemirror-lang-mermaid` is a
 * real Lezer grammar, so these are syntax nodes rather than regex guesses:
 * `flowchart` and `subgraph` are keywords, `TD` is the orientation, and a node
 * id is told apart from the label inside its shape brackets.
 *
 * Only the tags this grammar actually emits are listed. It does not tag the
 * shape delimiters themselves, and quoted labels and `|edge labels|` both come
 * through as `nodeText`, so `nodeEdge`, `nodeEdgeText`, `string` and `number`
 * are deliberately absent — styling them would be dead configuration.
 */
const HIGHLIGHT = HighlightStyle.define([
    { tag: mermaidTags.diagramName, color: 'var(--syntax-keyword)', fontWeight: '600' },
    { tag: flowchartTags.diagramName, color: 'var(--syntax-keyword)', fontWeight: '600' },
    { tag: flowchartTags.keyword, color: 'var(--syntax-keyword)', fontWeight: '600' },
    { tag: flowchartTags.orientation, color: 'var(--syntax-orientation)' },
    { tag: flowchartTags.nodeId, color: 'var(--syntax-node-id)' },
    { tag: flowchartTags.nodeText, color: 'var(--syntax-text)' },
    { tag: flowchartTags.link, color: 'var(--syntax-arrow)', fontWeight: '600' },
    { tag: flowchartTags.lineComment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
]);

/**
 * Structural styling only; every colour is a CSS variable from `index.css`.
 *
 * That matters for theming: a CodeMirror theme is baked into the editor state
 * at construction, so hard-coded colours would need the view rebuilt on every
 * theme switch. Deferring to variables lets `data-theme` repaint the editor
 * with no React involvement at all.
 */
const THEME = EditorView.theme({
    '&': { height: '100%', fontSize: '13px', color: 'var(--text)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        lineHeight: '1.6',
    },
    '.cm-content': { padding: '12px 0', caretColor: 'var(--text)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'var(--syntax-selection)',
    },
    '.cm-gutters': {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'var(--syntax-gutter)',
    },
    '.cm-activeLine': { backgroundColor: 'var(--syntax-active-line)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    '.cm-mermaid-selected-line': { backgroundColor: 'var(--syntax-selected-line)' },
    '.cm-mermaid-selected': {
        backgroundColor: 'var(--syntax-selected-token)',
        borderRadius: '3px',
        boxShadow: '0 0 0 1px var(--syntax-selected-token)',
    },
});

export interface MermaidEditorProps {
    readonly value: string;
    readonly onChange: (value: string) => void;
    /**
     * Node ids selected on the canvas; every occurrence of each is marked and
     * the first is scrolled into view. Empty when the selection came from the
     * caret — that line marks itself.
     */
    readonly highlightedIds: readonly CellId[];
    /** Ids on the caret's line, so the caret can drive the diagram. */
    readonly onCursorNodeChange: (ids: readonly CellId[]) => void;
}

/**
 * CodeMirror 6 bound to a controlled `value`.
 *
 * The view is created once and kept alive; `value` is pushed in only when it
 * differs from what the editor already holds, so the user's own typing never
 * round-trips through a document replacement (which would drop the cursor).
 */
export function MermaidEditor({
    value,
    onChange,
    highlightedIds,
    onCursorNodeChange,
}: MermaidEditorProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Read through refs so neither a new `onChange` identity nor a changed
    // `value` rebuilds the view: the mount effect below depends on nothing.
    const onChangeRef = useRef(onChange);
    const onCursorRef = useRef(onCursorNodeChange);
    const seedRef = useRef(value);
    // Last ids reported from the caret. Without this the listener would fire on
    // every keystroke and cursor nudge, restarting the selection round-trip for
    // a value that has not actually changed.
    const lastCursorKey = useRef('');
    useEffect(() => {
        onChangeRef.current = onChange;
        onCursorRef.current = onCursorNodeChange;
    }, [onChange, onCursorNodeChange]);

    useEffect(() => {
        const parent = hostRef.current;
        if (!parent) return;

        const view = new EditorView({
            parent,
            state: EditorState.create({
                doc: seedRef.current,
                extensions: [
                    lineNumbers(),
                    history(),
                    drawSelection(),
                    highlightActiveLine(),
                    keymap.of([...standardKeymap, ...historyKeymap, indentWithTab]),
                    mermaid(),
                    syntaxHighlighting(HIGHLIGHT),
                    mermaidSelectionHighlight(),
                    EditorView.lineWrapping,
                    THEME,
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) onChangeRef.current(update.state.doc.toString());
                        if (!update.docChanged && !update.selectionSet) return;
                        const ids = nodeIdsOnCursorLine(update.state);
                        const key = ids.join(' ');
                        if (key === lastCursorKey.current) return;
                        lastCursorKey.current = key;
                        onCursorRef.current(ids);
                    }),
                ],
            }),
        });
        viewRef.current = view;

        return () => {
            viewRef.current = null;
            view.destroy();
        };
    }, []);

    useEffect(() => {
        const view = viewRef.current;
        if (!view || view.state.doc.toString() === value) return;
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value }});
    }, [value]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const effects: StateEffect<unknown>[] = [setHighlightedIds.of(highlightedIds)];
        // Ids only arrive here from a canvas click, so anything to mark is also
        // worth scrolling to.
        const at = firstOccurrence(view.state, highlightedIds);
        if (at !== null) effects.push(EditorView.scrollIntoView(at, { y: 'center' }));
        view.dispatch({ effects });
    }, [highlightedIds]);

    return <div ref={hostRef} className="editor-code" />;
}
