import type { CellId } from '@joint/react-plus';
import { MermaidEditor } from './mermaid-editor';

export interface EditorPanelProps {
    readonly source: string;
    readonly error: string | null;
    readonly notice: string | null;
    readonly isParsing: boolean;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly highlightedIds: readonly CellId[];
    readonly onCursorNodeChange: (ids: readonly CellId[]) => void;
    readonly onSourceChange: (source: string) => void;
}

export function EditorPanel({
    source,
    error,
    notice,
    isParsing,
    nodeCount,
    edgeCount,
    highlightedIds,
    onCursorNodeChange,
    onSourceChange,
}: EditorPanelProps) {
    return (
        <section className="editor" aria-label="Mermaid source">
            <MermaidEditor
                value={source}
                onChange={onSourceChange}
                highlightedIds={highlightedIds}
                onCursorNodeChange={onCursorNodeChange}
            />

            <footer className="editor-stats">
                <span
                    className={`editor-counts${isParsing ? ' is-busy' : ''}`}
                    aria-live="polite"
                    aria-busy={isParsing}
                >
                    {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                    {' · '}
                    {edgeCount} {edgeCount === 1 ? 'edge' : 'edges'}
                </span>
                {/* The syntax this pane takes is Mermaid's, so credit it here. */}
                <a
                    className="editor-link"
                    href="https://mermaid.ai/open-source"
                    target="_blank"
                    rel="noreferrer"
                >
                    Mermaid&nbsp;&#8599;
                </a>
            </footer>

            {error !== null && (
                <p className="editor-message is-error" role="alert">
                    {error}
                </p>
            )}
            {error === null && notice !== null && <p className="editor-message is-notice">{notice}</p>}
        </section>
    );
}
