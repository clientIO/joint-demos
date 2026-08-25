// The actual CodeMirror-backed SQL editor. Split from sql-editor.tsx so React.lazy
// can pull CodeMirror + @codemirror/lang-sql into a separate chunk that only loads
// when a SQL surface is first opened. A single token-driven theme adapts to dark &
// light automatically. When `schema` is given, `sql({ schema })` adds table + column
// autocompletion (basicSetup's default `autocompletion` extension runs it).
import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { cn } from '../../utils/cn';
import { sqlEditorTheme } from './sql-editor-theme';
import type { SqlEditorProps } from './sql-editor';

// Names the editable region (CodeMirror's contenteditable) for assistive tech —
// the wrapper's aria-label doesn't reach the inner textbox.
const CONTENT_LABEL = EditorView.contentAttributes.of({ 'aria-label': 'SQL editor' });

// Make the scroll container keyboard-focusable so the scrollable SQL is reachable
// by keyboard (WCAG 2.1.1 / axe scrollable-region-focusable) — matters most for the
// read-only inspector editor, whose content is not itself a tab stop.
const FOCUSABLE_SCROLLER = ViewPlugin.define((view) => {
    view.scrollDOM.setAttribute('tabindex', '0');
    return {};
});

export function SqlEditorCodeMirror(props: SqlEditorProps) {
    const { value, onChange, readOnly = false, className, schema } = props;

    const extensions = useMemo<Extension[]>(
        () => [schema ? sql({ schema }) : sql(), sqlEditorTheme, CONTENT_LABEL, FOCUSABLE_SCROLLER],
        [schema],
    );

    // Stable identities: a fresh basicSetup object / onChange wrapper each render makes
    // @uiw/react-codemirror reconfigure the editor on every keystroke.
    const basicSetup = useMemo(
        () => ({
            lineNumbers: true,
            highlightActiveLine: !readOnly,
            highlightActiveLineGutter: !readOnly,
            foldGutter: false,
            searchKeymap: false,
        }),
        [readOnly],
    );

    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground',
                'transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40',
                className,
            )}
            aria-label="SQL editor"
        >
            <CodeMirror
                value={value}
                readOnly={readOnly}
                editable={!readOnly}
                extensions={extensions}
                theme="none"
                basicSetup={basicSetup}
                onChange={onChange}
            />
        </div>
    );
}
