// Lazy boundary for the SQL editor: CodeMirror + its SQL language mode are heavy
// (~200KB) and only needed once the user opens the SQL panel, the query runner, or
// an inspector's SQL section — none of which are on the initial paint. React.lazy
// keeps that code out of the main bundle; a lightweight text fallback shows the SQL
// for the split second the chunk streams in on first use.
import { Suspense, lazy } from 'react';
import { cn } from '../../utils/cn';

export interface SqlEditorProps {
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly className?: string;
  // table name -> column names; drives schema-aware autocompletion (intellisense).
  readonly schema?: Readonly<Record<string, readonly string[]>>;
}

const CodeMirrorEditor = lazy(() =>
    import('./sql-editor-codemirror').then((module) => ({ default: module.SqlEditorCodeMirror })),
);

// Same container chrome as the real editor so the swap is seamless; the SQL is
// shown read-only in a <pre> until CodeMirror mounts.
function EditorFallback({ value, className }: Pick<SqlEditorProps, 'value' | 'className'>) {
    return (
        <div
            aria-busy="true"
            className={cn(
                'group relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground',
                className,
            )}
        >
            <pre className="overflow-auto p-2 font-mono text-xs leading-relaxed text-muted-foreground">{value}</pre>
        </div>
    );
}

// Reusable syntax-highlighted SQL editor. Self-contained (no joint / app context).
export function SqlEditor(props: SqlEditorProps) {
    return (
        <Suspense fallback={<EditorFallback value={props.value} className={props.className} />}>
            <CodeMirrorEditor {...props} />
        </Suspense>
    );
}
