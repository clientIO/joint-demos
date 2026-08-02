import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import logoUrl from '@/assets/jointjs-logo.svg';
import { MermaidDiagram } from '@/components/diagram';
import { EditorPanel } from '@/components/editor-panel';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/hooks/use-theme';
import { setNodeFill, setNodeLabel, setNodeShape } from '@/mermaid/edit-source';
import type { EditableShape } from '@/mermaid/edit-source';
import { MermaidParseError, parseFlowchart } from '@/mermaid/parse';
import { DEFAULT_PRESET, PRESETS } from '@/mermaid/presets';
import { toCells } from '@/mermaid/to-cells';
import type { MermaidCell } from '@/mermaid/to-cells';
import type { FlowDirection } from '@/mermaid/types';
import type { NodeEditHandlers } from '@/components/diagram';
import type { CellId } from '@joint/react-plus';

/**
 * Typing is debounced; a discrete edit is not.
 *
 * The delay exists so a half-typed line is not parsed on every keystroke.
 * Charging it to a click — picking a shape, choosing an example — just makes
 * the app feel slow, so those parse straight away.
 */
const DEBOUNCE_MS = 300;
const NO_CELLS: readonly MermaidCell[] = [];
const NO_IDS: readonly CellId[] = [];

interface Rendered {
    readonly direction: FlowDirection;
    readonly cells: readonly MermaidCell[];
}

const EMPTY: Rendered = { direction: 'TB', cells: NO_CELLS };

/**
 * The selected nodes, plus where the selection came from.
 *
 * The app owns this so the diagram and the editor never drive each other
 * directly — each reports its gesture up and renders what comes back down,
 * which is what keeps the two-way binding from oscillating.
 *
 * The origin decides whether the editor marks anything. A canvas click should
 * point at the source, so every occurrence lights up and the first scrolls into
 * view. A caret move must not: the user is already looking at the line, the
 * active-line tint already marks it, and painting the same id everywhere else
 * would just add noise to the text they are editing.
 */
interface Selection {
    readonly ids: readonly CellId[];
    readonly origin: 'canvas' | 'editor';
}

const NO_SELECTION: Selection = { ids: NO_IDS, origin: 'editor' };

export function App() {
    const { theme, toggle: toggleTheme } = useTheme();
    // The text, plus whether the change that produced it should parse at once.
    const [draft, setDraft] = useState({ text: DEFAULT_PRESET.source, immediate: true });
    const source = draft.text;
    const setSource = useCallback(
        (text: string, immediate = false) => setDraft({ text, immediate }),
        []
    );
    const [presetId, setPresetId] = useState(DEFAULT_PRESET.id);
    // The last diagram that parsed cleanly. Keeping it on screen while the
    // source is mid-edit is much calmer than blanking the canvas on every
    // half-typed line.
    const [rendered, setRendered] = useState<Rendered>(EMPTY);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    // The source text the current result belongs to; anything else means a
    // parse is pending. Derived rather than stored so the effect never has to
    // set state synchronously.
    const [parsedSource, setParsedSource] = useState<string | null>(null);
    const isParsing = parsedSource !== source;
    const nodeCount = rendered.cells.filter((cell) => cell.type === 'element').length;
    const edgeCount = rendered.cells.length - nodeCount;
    // Bumped when a different diagram is loaded, which is the only time the
    // canvas re-frames itself. Editing the source leaves the camera alone.
    const [fitToken, setFitToken] = useState(0);
    // Read through a ref so the toolbar handlers stay stable; a new identity on
    // every keystroke would remount the overlay mid-edit.
    const sourceRef = useRef(source);
    useEffect(() => {
        sourceRef.current = source;
    }, [source]);
    const [selection, setSelection] = useState<Selection>(NO_SELECTION);
    const selectFromCanvas = useCallback(
        (ids: readonly CellId[]) => setSelection({ ids, origin: 'canvas' }),
        []
    );
    const selectFromEditor = useCallback(
        (ids: readonly CellId[]) => setSelection({ ids, origin: 'editor' }),
        []
    );

    useEffect(() => {
        let cancelled = false;

        const run = () => {
            parseFlowchart(source).then(
                (flow) => {
                    if (cancelled) return;
                    setRendered({ direction: flow.direction, cells: toCells(flow) });
                    setError(null);
                    setNotice(
                        flow.droppedSubgraphs > 0
                            ? `${flow.droppedSubgraphs} subgraph${flow.droppedSubgraphs > 1 ? 's were' : ' was'} ignored — this demo renders a flat graph.`
                            : null
                    );
                    setParsedSource(source);
                },
                (reason: unknown) => {
                    if (cancelled) return;
                    setError(
                        reason instanceof MermaidParseError || reason instanceof Error
                            ? reason.message
                            : String(reason)
                    );
                    setParsedSource(source);
                }
            );
        };

        if (draft.immediate) {
            run();
            return () => {
                cancelled = true;
            };
        }

        const timer = setTimeout(run, DEBOUNCE_MS);
        // Cancelling both the timer and the in-flight parse keeps a slow parse
        // of stale text from overwriting a newer result.
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [draft, source]);

    function handlePresetChange(nextId: string) {
        const preset = PRESETS.find((candidate) => candidate.id === nextId);
        if (!preset) return;
        setPresetId(preset.id);
        setSource(preset.source, true);
        setFitToken((token) => token + 1);
    }

    /**
     * The node toolbar rewrites a span of the source rather than regenerating
     * it, so comments and formatting survive and the change flows back through
     * the same parse the editor uses.
     */
    const edit = useMemo<NodeEditHandlers>(() => {
        const apply = (next: string | null) => {
            if (next === null) return;
            setSource(next, true);
            setPresetId('custom');
        };
        return {
            onLabelChange: (id, label) => apply(setNodeLabel(sourceRef.current, id, label)),
            onShapeChange: (id, shape: EditableShape) =>
                apply(setNodeShape(sourceRef.current, id, shape)),
            onFillChange: (id, fill) => apply(setNodeFill(sourceRef.current, id, fill)),
        };
    }, [setSource]);

    function handleSourceChange(next: string) {
        setSource(next);
        // Once the text diverges from the example, stop claiming it is one.
        const preset = PRESETS.find((candidate) => candidate.id === presetId);
        if (preset && preset.source !== next) setPresetId('custom');
    }

    return (
        <div className="app">
            <header className="app-header">
                <div className="app-lead">
                    <h1 className="app-title">Mermaid Editor</h1>
                    <label className="app-field">
                        <span>Example</span>
                        <select
                            className="app-select"
                            value={presetId}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                handlePresetChange(event.target.value)}
                        >
                            {PRESETS.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                    {preset.name}
                                </option>
                            ))}
                            {presetId === 'custom' && <option value="custom">Custom</option>}
                        </select>
                    </label>
                </div>
                <div className="app-actions">
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                    <a
                        className="app-brand"
                        href="https://www.jointjs.com/jointjs-plus"
                        target="_blank"
                        rel="noreferrer"
                        title="Built with JointJS+"
                    >
                        <img src={logoUrl} alt="JointJS+" className="app-logo" />
                    </a>
                </div>
            </header>

            <main className="app-body">
                <EditorPanel
                    source={source}
                    error={error}
                    notice={notice}
                    isParsing={isParsing}
                    nodeCount={nodeCount}
                    edgeCount={edgeCount}
                    highlightedIds={selection.origin === 'canvas' ? selection.ids : NO_IDS}
                    onCursorNodeChange={selectFromEditor}
                    onSourceChange={handleSourceChange}
                />
                <div className="canvas">
                    <MermaidDiagram
                        direction={rendered.direction}
                        cells={rendered.cells}
                        selectedIds={selection.ids}
                        onSelect={selectFromCanvas}
                        fitToken={fitToken}
                        edit={edit}
                    />
                </div>
            </main>
        </div>
    );
}
