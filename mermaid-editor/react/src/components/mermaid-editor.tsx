import type { CellId } from '@joint/react-plus';
import type * as Monaco from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { parseFlowchartSpans } from '@/mermaid/flowchart-tree';

/**
 * The Mermaid source pane, backed by the Monaco editor.
 *
 * Monaco brings the whole editing feature set — find and replace, multiple
 * cursors, undo history, bracket matching, indentation — for free; what this
 * file adds is the Mermaid-specific part: a Monarch tokenizer for flowchart
 * syntax, themes matching the app palette, decorations marking the nodes
 * selected on the canvas, and the caret-to-diagram link. Both directions of
 * that link read the same Lezer parse (`parseFlowchartSpans`) the source
 * edits use, so all three agree on what a node id is.
 *
 * Monaco is loaded lazily: it is a couple of megabytes that should not sit in
 * the entry chunk next to a diagram that renders without it.
 */

type MonacoModule = typeof Monaco;

const LANGUAGE_ID = 'mermaid-flowchart';

/** One shared load; the editor mounts whenever it resolves. */
let monacoReady: Promise<MonacoModule> | undefined;

function loadMonaco(): Promise<MonacoModule> {
    monacoReady ??= Promise.all([
        import('monaco-editor'),
        // The worker handles tokenization off-thread; one generic editor
        // worker is all a custom Monarch language needs.
        import('monaco-editor/esm/vs/editor/editor.worker.js?worker'),
    ]).then(([monaco, { default: EditorWorker }]) => {
        self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
        defineLanguage(monaco);
        return monaco;
    });
    return monacoReady;
}

/** Monarch grammar: close enough for colour, exact parsing stays with Lezer. */
function defineLanguage(monaco: MonacoModule): void {
    if (monaco.languages.getLanguages().some((language) => language.id === LANGUAGE_ID)) return;
    monaco.languages.register({ id: LANGUAGE_ID });
    monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
        comments: { lineComment: '%%' },
        brackets: [['[', ']'], ['(', ')'], ['{', '}']],
        autoClosingPairs: [
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '{', close: '}' },
            { open: '"', close: '"' },
        ],
    });
    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
        keywords: [
            'flowchart', 'graph', 'subgraph', 'end', 'style', 'classDef', 'class',
            'click', 'linkStyle', 'direction', 'interpolate', 'default', 'href', 'call',
        ],
        orientations: ['TB', 'TD', 'BT', 'LR', 'RL'],
        tokenizer: {
            root: [
                [/%%.*$/, 'comment'],
                [/"[^"]*"/, 'string'],
                [/\|[^|]*\|/, 'string'],
                // Arrows before ids, so `-->` never lexes as text.
                [/[<xo]?(?:-{2,}|={2,}|-\.+-)[>xo]?/, 'operator.arrow'],
                [/@\{[^}]*\}/, 'string.meta'],
                [/[[\](){}]/, '@brackets'],
                [/&/, 'operator'],
                [/[A-Za-z_][\w-]*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@orientations': 'type.orientation',
                        '@default': 'identifier',
                    },
                }],
                [/\d+/, 'number'],
            ],
        },
    });

    // Colours mirror the `--syntax-*` variables in index.css; Monaco themes
    // take literal values, so the palette is duplicated here on purpose.
    monaco.editor.defineTheme('mermaid-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '7c3aed', fontStyle: 'bold' },
            { token: 'type.orientation', foreground: '0e7490' },
            { token: 'identifier', foreground: '1d4ed8' },
            { token: 'string', foreground: '0f766e' },
            { token: 'string.meta', foreground: '0f766e' },
            { token: 'operator.arrow', foreground: 'be123c', fontStyle: 'bold' },
            { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
        ],
        colors: {
            'editor.background': '#f6f7f9',
            'editor.foreground': '#1f2430',
            'editor.lineHighlightBackground': '#f3f4f8',
            'editor.selectionBackground': '#dbeafe',
            'editorLineNumber.foreground': '#69707e',
        },
    });
    monaco.editor.defineTheme('mermaid-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: 'c4b5fd', fontStyle: 'bold' },
            { token: 'type.orientation', foreground: '5eead4' },
            { token: 'identifier', foreground: '7dd3fc' },
            { token: 'string', foreground: '6ee7b7' },
            { token: 'string.meta', foreground: '6ee7b7' },
            { token: 'operator.arrow', foreground: 'fda4af', fontStyle: 'bold' },
            { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        ],
        colors: {
            'editor.background': '#101119',
            'editor.foreground': '#e6e7ee',
            'editor.lineHighlightBackground': '#1c1e28',
            'editor.selectionBackground': '#2a3350',
            'editorLineNumber.foreground': '#8b92a3',
        },
    });
}

/** The active app theme, read from the `data-theme` attribute `useTheme` sets. */
function currentTheme(): string {
    return document.documentElement.dataset.theme === 'dark' ? 'mermaid-dark' : 'mermaid-light';
}

/** Spans of every `NodeId` token in the text, in document order. */
function nodeIdSpans(text: string): Array<{ id: string; from: number; to: number }> {
    return parseFlowchartSpans(text)
        .filter((span) => span.name === 'NodeId')
        .map((span) => ({ id: text.slice(span.from, span.to), from: span.from, to: span.to }));
}

/** Ids mentioned on the caret's line — what drives the diagram selection. */
function idsOnLine(text: string, lineStart: number, lineEnd: number): CellId[] {
    const seen: CellId[] = [];
    for (const span of nodeIdSpans(text)) {
        if (span.to < lineStart || span.from > lineEnd) continue;
        if (!seen.includes(span.id)) seen.push(span.id);
    }
    return seen;
}

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
 * Monaco bound to a controlled `value`.
 *
 * The editor is created once and kept alive; `value` is pushed in only when it
 * differs from what the editor already holds, through an edit operation rather
 * than `setValue`, so the undo history survives toolbar edits.
 */
export function MermaidEditor({
    value,
    onChange,
    highlightedIds,
    onCursorNodeChange,
}: MermaidEditorProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<MonacoModule | null>(null);
    const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
    // Guards the write-back loop: edits this component pushes into the model
    // must not come back out through `onChange`.
    const isApplyingRef = useRef(false);
    // Bumped when the lazy load lands, so the sync effects below re-run
    // against an editor that finally exists.
    const [readyTick, setReadyTick] = useState(0);
    // Read through refs so neither a new callback identity nor a changed
    // `value` recreates the editor: the mount effect depends on nothing.
    const onChangeRef = useRef(onChange);
    const onCursorRef = useRef(onCursorNodeChange);
    const seedRef = useRef(value);
    const lastCursorKey = useRef('');
    useEffect(() => {
        onChangeRef.current = onChange;
        onCursorRef.current = onCursorNodeChange;
    }, [onChange, onCursorNodeChange]);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        let disposed = false;
        let editor: Monaco.editor.IStandaloneCodeEditor | undefined;
        let observer: MutationObserver | undefined;

        void loadMonaco().then((monaco) => {
            if (disposed) return;
            monacoRef.current = monaco;
            editor = monaco.editor.create(host, {
                value: seedRef.current,
                language: LANGUAGE_ID,
                theme: currentTheme(),
                ariaLabel: 'Mermaid source code',
                automaticLayout: true,
                fontSize: 13,
                lineHeight: 21,
                minimap: { enabled: false },
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                occurrencesHighlight: 'off',
                folding: false,
                lineNumbersMinChars: 3,
                padding: { top: 12, bottom: 12 },
                scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                stickyScroll: { enabled: false },
            });
            editorRef.current = editor;
            decorationsRef.current = editor.createDecorationsCollection();

            editor.onDidChangeModelContent(() => {
                if (isApplyingRef.current) return;
                onChangeRef.current(editor?.getValue() ?? '');
            });
            editor.onDidChangeCursorPosition((event) => {
                const model = editor?.getModel();
                if (!model) return;
                const line = event.position.lineNumber;
                const from = model.getOffsetAt({ lineNumber: line, column: 1 });
                const to = from + model.getLineLength(line);
                const ids = idsOnLine(model.getValue(), from, to);
                const key = ids.join(' ');
                if (key === lastCursorKey.current) return;
                lastCursorKey.current = key;
                // A caret move CAUSED by our own document write is not the
                // user pointing at anything: replacing the whole model moves
                // the tracked cursor, and Monaco recovers its position from
                // markers, firing this handler synchronously. Reporting that
                // recovered line would overwrite a selection the same edit
                // just asked for — a node added from the toolbar would
                // deselect itself. The key is still recorded above, so the
                // user's next real caret move is not swallowed.
                if (isApplyingRef.current) return;
                onCursorRef.current(ids);
            });

            // The theme toggle flips `data-theme` on <html>; follow it.
            observer = new MutationObserver(() => {
                monaco.editor.setTheme(currentTheme());
            });
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme'],
            });

            // Re-run the value/highlight effects now that the editor exists.
            setReadyTick((tick) => tick + 1);
        });

        return () => {
            disposed = true;
            observer?.disconnect();
            decorationsRef.current = null;
            editorRef.current = null;
            editor?.dispose();
        };
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        const model = editor?.getModel();
        if (!editor || !model || model.getValue() === value) return;
        // A whole-document edit rather than `setValue`, so undo survives a
        // toolbar edit — and the user's next Cmd+Z steps back through it.
        isApplyingRef.current = true;
        editor.executeEdits('mermaid-sync', [
            { range: model.getFullModelRange(), text: value },
        ]);
        isApplyingRef.current = false;
    }, [value, readyTick]);

    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const decorations = decorationsRef.current;
        const model = editor?.getModel();
        if (!editor || !monaco || !decorations || !model) return;
        const wanted = new Set(highlightedIds.map(String));
        const spans = nodeIdSpans(model.getValue()).filter((span) => wanted.has(span.id));
        decorations.set(spans.map((span) => ({
            range: monaco.Range.fromPositions(
                model.getPositionAt(span.from),
                model.getPositionAt(span.to)
            ),
            options: { inlineClassName: 'mermaid-editor-mark' },
        })));
        // Ids only arrive here from a canvas click, so anything to mark is
        // also worth scrolling to.
        const [first] = spans;
        if (first) {
            editor.revealRangeInCenterIfOutsideViewport(
                monaco.Range.fromPositions(
                    model.getPositionAt(first.from),
                    model.getPositionAt(first.to)
                )
            );
        }
    }, [highlightedIds, readyTick]);

    return <div ref={hostRef} className="editor-code" />;
}
