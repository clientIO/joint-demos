import type { CellId } from '@joint/react-plus';
import { MermaidEditor } from './mermaid-editor';

/**
 * Saves the pane's text as a `.mmd` file — the portable form every Mermaid
 * tool accepts. It lives in this footer because it exports the *source*; the
 * SVG button on the canvas exports the *drawing*.
 */
function downloadSource(source: string) {
    const blob = new Blob([source], { type: 'text/vnd.mermaid' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'diagram.mmd';
    anchor.click();
    URL.revokeObjectURL(url);
}

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
                <span className="editor-tools">
                    <button
                        type="button"
                        className="editor-download"
                        title="Download the source as diagram.mmd"
                        onClick={() => downloadSource(source)}
                    >
                        .mmd&nbsp;&#8595;
                    </button>
                    {/* The syntax this pane takes is Mermaid's, so credit it here. */}
                    <a
                        className="editor-link"
                        href="https://mermaid.ai/open-source"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Mermaid&nbsp;&#8599;
                    </a>
                </span>
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
