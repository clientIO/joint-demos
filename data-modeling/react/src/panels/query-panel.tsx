// Bottom-docked QUERY RUNNER: run ARBITRARY SQL against a PERSISTENT in-browser
// database. The engine (SQLite via sql.js, Postgres via lazy pglite) is picked
// from the active dialect — MySQL is generate-only, so Run is disabled there.
//
// PERSISTENCE MODEL: the DB is created once per session and kept. "Reset DB"
// (re)creates it and applies the current schema DDL; "Run" executes the user's
// SQL against that live DB WITHOUT re-applying the DDL, so INSERT/UPDATE/DELETE
// state accumulates. A row-returning statement fills the ResultsGrid; a mutation
// or DDL statement reports a success + affected-rows message. Multiple statements
// per run are supported — the engine reports the last statement's result.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { CheckCircle2, Loader2, Play, RotateCcw, TableProperties, X } from 'lucide-react';
import { useSchema } from '@/model/use-schema';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { SqlEditor } from '@/panels/sql-editor/sql-editor';
import { SqlFileImportButton } from '@/panels/sql-file-import-button';
import { ResultsGrid } from '@/query/results-grid';
import { useDialect } from '@/context/dialect-context';
import type { UseSqlEngineResult } from '@/hooks/use-sql-engine';
import { generateDdl } from '@/schema/generate-ddl';
import { generateSampleQueries, type SampleQuery } from '@/schema/generate-query';
import { insertSample } from '@/query/sample-insert';
import { formatSql } from '@/schema/format-sql';
import type { QueryResult } from '@/db/types';

// After a run, the right pane shows either the returned rows (SELECT / RETURNING)
// or a success message with the affected-row count (INSERT / UPDATE / DELETE / DDL).
type Outcome =
  | { readonly kind: 'rows'; readonly result: QueryResult }
  | { readonly kind: 'affected'; readonly rowCount: number; readonly elapsedMs?: number };

interface QueryPanelProps {
  readonly open: boolean;
  readonly onClose: () => void;
  // The SQL engine, owned by the app so the DB survives closing/reopening the panel.
  readonly engine: UseSqlEngineResult;
  // INSERT statements from an imported dump (empty when none) — seeded after the DDL
  // so queries run against the dump's real data, not an empty schema.
  readonly seedData: string;
  // Controlled height (owned by the app so the minimap can sit above the panel).
  readonly height: number;
  readonly onHeightChange: (height: number) => void;
}

// Height bounds for the drag-to-resize bottom panel.
const MIN_HEIGHT = 200;
const MAX_HEIGHT_FRACTION = 0.82;

export function QueryPanel({ open, onClose, engine, seedData, height, onHeightChange }: QueryPanelProps) {
    // Structurally-stable schema so the sample-query generation below doesn't re-run
    // on every position-drag commit.
    const schema = useSchema();
    const { dialect } = useDialect();
    // While dragging the resizer the height transition must be OFF, or the panel lags
    // behind the pointer; it's only for the open/close animation.
    const [resizing, setResizing] = useState(false);

    // Move focus INTO the runner when it opens (parity with the Import dialog) so a keyboard
    // user who hit Enter on the toolbar toggle lands in the panel, not stranded on the button.
    const panelRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (open) panelRef.current?.focus();
    }, [open]);

    // On a phone the resizable ~320px panel is far too short for the editor + samples + Run +
    // results side by side, so below `lg` the runner opens as a TALL bottom sheet (~82vh) and
    // its body stacks into one scrollable column (see the grid + heights below).
    const isMobile = useIsMobile();
    const panelHeight = isMobile
        ? Math.round((typeof window === 'undefined' ? 800 : window.innerHeight) * 0.82)
        : height;

    // Drag the top edge to resize the panel (and with it the SQL editor). Window
    // listeners so the drag continues outside the handle; no rAF (direct setState).
    const onResizeStart = useCallback(
        (event: React.PointerEvent) => {
            event.preventDefault();
            setResizing(true);
            const startY = event.clientY;
            const startHeight = height;
            const max = window.innerHeight * MAX_HEIGHT_FRACTION;
            const onMove = (moveEvent: PointerEvent) => {
                const next = startHeight + (startY - moveEvent.clientY);
                onHeightChange(Math.max(MIN_HEIGHT, Math.min(max, next)));
            };
            const onUp = () => {
                setResizing(false);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        },
        [height, onHeightChange],
    );

    // Keyboard resize (WAI-ARIA window-splitter pattern): Up/Down nudge the height,
    // Home/End jump to the min/max.
    const onResizeKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            const max = window.innerHeight * MAX_HEIGHT_FRACTION;
            const STEP = 24;
            const next =
        event.key === 'ArrowUp'
            ? height + STEP
            : event.key === 'ArrowDown'
                ? height - STEP
                : event.key === 'End'
                    ? max
                    : event.key === 'Home'
                        ? MIN_HEIGHT
                        : null;
            if (next === null) return;
            event.preventDefault();
            onHeightChange(Math.max(MIN_HEIGHT, Math.min(max, next)));
        },
        [height, onHeightChange],
    );

    // MySQL is generate-only; everything else maps 1:1 to an executable engine.
    const engineKind = dialect === 'mysql' ? null : dialect;
    const { kind, setKind, run, ensureSeeded, reset, isLoading, error } = engine;

    // ponytail: align the engine to the dialect during render (React's "adjust
    // state on prop change" idiom), NOT in the click handler — `run` closes over
    // `kind`, so aligning here guarantees Run uses the right engine without an
    // effect and without depending on a same-tick setState landing.
    if (engineKind !== null && kind !== engineKind) setKind(engineKind);

    const samples = useMemo<SampleQuery[]>(() => {
        if (engineKind === null) return [];
        const insert = insertSample(schema, dialect);
        const selects = generateSampleQueries(schema, dialect);
        return insert ? [insert, ...selects] : selects;
    }, [schema, dialect, engineKind]);

    // Default to the first SELECT so the initial view is a rows result.
    const [query, setQuery] = useState(() => {
        if (engineKind === null) return '';
        const first = generateSampleQueries(schema, dialect)[0];
        return first ? formatSql(first.sql, dialect) : '';
    });
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    const canRun = engineKind !== null && query.trim() !== '' && !isLoading;

    const onRun = useCallback(async() => {
        if (engineKind === null || query.trim() === '') return;
        // Seed the schema once (no-op after the first run for this engine), then run
        // the user's SQL against the accumulated DB.
        const seeded = await ensureSeeded(generateDdl(schema, dialect), seedData);
        if (!seeded) {
            setOutcome(null);
            return;
        }
        const res = await run(query);
        if (res === undefined) {
            setOutcome(null); // hook set `error`
            return;
        }
        setOutcome(
            res.columns.length > 0
                ? { kind: 'rows', result: res }
                : { kind: 'affected', rowCount: res.rowCount, elapsedMs: res.elapsedMs },
        );
    }, [engineKind, query, ensureSeeded, run, schema, dialect, seedData]);

    const onReset = useCallback(async() => {
        if (engineKind === null) return;
        setOutcome(null);
        await reset(generateDdl(schema, dialect), seedData);
    }, [engineKind, reset, schema, dialect, seedData]);

    return (
    // A FLEX child (not an overlay) that pushes the canvas up so fit-to-screen frames
    // only the visible area above it. Open/close animates the GRID TRACK
    // (grid-template-rows 0px -> height), the approved smooth reveal, instead of the
    // element's own height (a layout-property animation). No transition while dragging
    // the resizer — the track follows the live height then.
        <div
            className={cn(
                'grid shrink-0',
                resizing ? '' : 'transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
            )}
            style={{ gridTemplateRows: open ? `${panelHeight}px` : '0px' }}
        >
            <section
                ref={panelRef}
                // Target of the toolbar "Run query" toggle's `aria-controls` — the toggle lives
                // in the toolbar, this panel in the main area, so the id is their only link.
                id="query-runner-panel"
                tabIndex={-1}
                aria-label="SQL query runner"
                inert={!open}
                className="relative overflow-hidden border-t border-border bg-background outline-none"
            >
                {/* Drag the top edge to resize the panel — or focus it and use the arrow keys
          (Home/End jump to the min/max height) so it's operable without a pointer. */}
                <div
                    role="separator"
                    tabIndex={0}
                    aria-orientation="horizontal"
                    aria-label="Resize query panel"
                    aria-valuenow={Math.round(height)}
                    aria-valuemin={MIN_HEIGHT}
                    aria-valuemax={Math.round(window.innerHeight * MAX_HEIGHT_FRACTION)}
                    onPointerDown={onResizeStart}
                    onKeyDown={onResizeKeyDown}
                    // Resize is a desktop affordance; the mobile sheet is a fixed tall height.
                    className="absolute inset-x-0 top-0 z-10 hidden h-1.5 cursor-ns-resize bg-transparent outline-none transition-colors hover:bg-primary/40 focus-visible:bg-primary/60 lg:block"
                />
                {/* Fixed-height inner so content doesn't reflow while the panel collapses. */}
                <div style={{ height: panelHeight }} className="flex flex-col">
                    <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                        <div className="flex items-center gap-2">
                            <TableProperties className="size-4 text-primary" />
                            <h2 className="text-sm font-semibold text-foreground">SQL Query Runner</h2>
                            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-secondary-foreground">
                                {dialect}
                            </span>
                        </div>
                        <IconButton label="Close query runner" icon={X} onClick={onClose} />
                    </header>

                    {/* One scrollable column on mobile (editor → samples → actions → results), two columns
          side by side from lg up. */}
                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-2 lg:overflow-hidden">
                        {/* Left: editor + samples + actions */}
                        <div className="flex min-h-0 flex-col gap-2">
                            <SqlEditor
                                value={query}
                                onChange={setQuery}
                                className="min-h-[9rem] flex-1 overflow-auto lg:min-h-0"
                            />

                            {samples.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sample queries">
                                    {samples.map((sample, index) => (
                                        <button
                                            // Title alone collides when two tables share a name (e.g. two
                                            // "new_table"s) — pair it with the index to stay unique.
                                            key={`${sample.title}-${index}`}
                                            type="button"
                                            onClick={() => setQuery(formatSql(sample.sql, dialect))}
                                            className={cn(
                                                'rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground',
                                                'transition-colors hover:border-primary/50 hover:text-foreground',
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            )}
                                        >
                                            {sample.title}
                                        </button>
                                    ))}
                                </div>
                            ) : null}

                            <div className="flex items-center justify-between gap-3">
                                {engineKind === null ? (
                                    <p role="note" className="text-xs text-muted-foreground">
                MySQL is generate-only — switch to SQLite or Postgres to run.
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                Persistent session DB — inserts stay until you reset.
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <SqlFileImportButton onLoad={setQuery} disabled={isLoading} />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onReset}
                                        disabled={engineKind === null || isLoading}
                                        title="Recreate the database and re-apply the schema"
                                    >
                                        <RotateCcw />
                Reset DB
                                    </Button>
                                    <Button size="sm" onClick={onRun} disabled={!canRun}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : <Play />}
                Run
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right (or, stacked, below): rows grid or a success message. A min-height keeps it
            usable when it drops under the editor on mobile. */}
                        <div className="flex min-h-[14rem] flex-col lg:min-h-0">
                            {outcome?.kind === 'affected' && error === null && !isLoading ? (
                                <AffectedCard rowCount={outcome.rowCount} elapsedMs={outcome.elapsedMs} />
                            ) : (
                                <ResultsGrid
                                    result={outcome?.kind === 'rows' ? outcome.result : null}
                                    error={error?.message}
                                    isLoading={isLoading}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Success state for INSERT / UPDATE / DELETE / DDL — no rows, just a count.
function AffectedCard({
    rowCount,
    elapsedMs,
}: {
  readonly rowCount: number;
  readonly elapsedMs?: number;
}) {
    const timing =
    elapsedMs === undefined ? '' : ` · ${elapsedMs.toFixed(elapsedMs < 10 ? 1 : 0)}ms`;
    return (
        <div
            role="status"
            className="flex min-h-0 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-6 text-center text-card-foreground"
        >
            <CheckCircle2 className="size-6 text-status-success" />
            <p className="text-sm font-medium text-foreground">Statement executed</p>
            <p className="text-xs text-muted-foreground">
                {rowCount} {rowCount === 1 ? 'row' : 'rows'} affected{timing}
            </p>
        </div>
    );
}
