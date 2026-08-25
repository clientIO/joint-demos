// Live SQL panel: a right-docked, hideable view of the whole schema as DDL,
// derived on every render from the controlled cells (no effect, no local copy
// of the schema — cells are the single source of truth). Dialect-aware: the
// active dialect drives both the generated SQL and the header label.
//
// EDITABLE on purpose: the visual graph can't express everything (exotic column
// types, extra constraints), so editing the DDL here and hitting Apply is the
// escape hatch — it re-parses the SQL and applies it to the live schema.
//
// RESIZABLE from its LEFT edge — the exact mechanics of the query runner's top-edge
// resizer, rotated: pointer drag with window listeners, arrow keys + Home/End on the
// separator, and the open/close animation runs on the GRID TRACK (grid-template-
// columns), switched off while dragging so the panel tracks the pointer.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { SqlEditor } from '@/panels/sql-editor/sql-editor';
import { dialectLabel, useDialect } from '@/context/dialect-context';
import { useSchema } from '@/model/use-schema';
import { generateDdl } from '@/schema/generate-ddl';
import { formatSql } from '@/schema/format-sql';
import { cn } from '@/utils/cn';
import type { Schema } from '@/schema/types';

// Width bounds for the drag-to-resize right panel (mirrors the query panel's
// MIN_HEIGHT / MAX_HEIGHT_FRACTION).
const MIN_WIDTH = 300;
const MAX_WIDTH_FRACTION = 0.6;

export function RightSqlPanel({
    open,
    onClose,
    onApply,
    width,
    onWidthChange,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onApply: (schema: Schema) => void;
  // Controlled width (owned by the app so it survives close/reopen).
  readonly width: number;
  readonly onWidthChange: (width: number) => void;
}) {
    const { dialect } = useDialect();
    // Structurally-stable schema: DDL generation + formatting below only re-run when
    // the schema actually changes, not on every position-drag commit.
    const schema = useSchema();
    // Memoized: without it, editing (setEdited/setErrors) re-runs DDL generation +
    // formatting on every keystroke even though the schema hasn't changed.
    const sql = useMemo(() => formatSql(generateDdl(schema, dialect), dialect), [schema, dialect]);

    // While dragging the resizer the width transition must be OFF, or the panel lags
    // behind the pointer; it's only for the open/close animation.
    const [resizing, setResizing] = useState(false);

    // Drag the left edge to resize. Window listeners so the drag continues outside
    // the handle; no rAF (direct setState) — same as the query panel.
    const onResizeStart = useCallback(
        (event: React.PointerEvent) => {
            event.preventDefault();
            setResizing(true);
            const startX = event.clientX;
            const startWidth = width;
            const max = window.innerWidth * MAX_WIDTH_FRACTION;
            const onMove = (moveEvent: PointerEvent) => {
                // Dragging LEFT widens the right-docked panel.
                const next = startWidth + (startX - moveEvent.clientX);
                onWidthChange(Math.max(MIN_WIDTH, Math.min(max, next)));
            };
            const onUp = () => {
                setResizing(false);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        },
        [width, onWidthChange],
    );

    const onResizeKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            const max = window.innerWidth * MAX_WIDTH_FRACTION;
            const STEP = 24;
            const next =
        event.key === 'ArrowLeft'
            ? width + STEP
            : event.key === 'ArrowRight'
                ? width - STEP
                : event.key === 'End'
                    ? max
                    : event.key === 'Home'
                        ? MIN_WIDTH
                        : null;
            if (next === null) return;
            event.preventDefault();
            onWidthChange(Math.max(MIN_WIDTH, Math.min(max, next)));
        },
        [width, onWidthChange],
    );

    // table name -> column names, feeds the editor's schema-aware autocompletion.
    const schemaMap = useMemo<Readonly<Record<string, readonly string[]>>>(
        () =>
            Object.fromEntries(
                schema.tables.map((table): [string, readonly string[]] => [
                    table.name,
                    table.columns.map((c) => c.name),
                ]),
            ),
        [schema],
    );

    // `null` = follow the live generated SQL; a string = a dirty local edit.
    const [edited, setEdited] = useState<string | null>(null);
    const [errors, setErrors] = useState<readonly string[]>([]);
    const dirty = edited !== null;
    const value = edited ?? sql;

    // Move focus INTO the panel when it opens (parity with the Import dialog) so a keyboard
    // user who hit Enter on the toolbar toggle lands in the panel instead of being left on
    // the button. Focus the region, not the code editor, so Tab then walks the panel controls.
    const panelRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (open) panelRef.current?.focus();
    }, [open]);

    const [copied, setCopied] = useState(false);
    function copy() {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        // ponytail: fire-and-forget reset; a late timer on an unmounted panel is
        // harmless (React 18+ no-ops the stale setState).
        window.setTimeout(() => setCopied(false), 1500);
    }

    function reset() {
        setEdited(null);
        setErrors([]);
    }

    // node-sql-parser loads lazily on apply (see import-dialog for the same reasoning).
    async function apply() {
        const { importSql } = await import('@/schema/import-sql');
        const result = importSql(value, dialect);
        // Block ONLY when nothing was salvaged (mirrors the import dialog): warnings with
        // tables parsed must not wall off the apply.
        if (result.schema.tables.length === 0) {
            setErrors(
                result.errors.length > 0
                    ? result.errors
                    : ['No CREATE TABLE statements found. Nothing to apply.'],
            );
            return;
        }
        setErrors([]);
        setEdited(null); // applied — resume following the live schema
        onApply(result.schema);
    }

    return (
        <div
            inert={!open}
            style={{ gridTemplateColumns: open ? `${width}px` : '0px' }}
            className={cn(
                'grid h-full shrink-0',
                resizing ? '' : 'transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none',
            )}
        >
            <div className="overflow-hidden">
                {/* Fixed-width inner so content doesn't reflow while the panel collapses. */}
                <div style={{ width }} className="relative h-full">
                    {/* Drag the left edge to resize the panel — or focus it and use the arrow
              keys (Home/End jump to the min/max width) so it's operable without a
              pointer. */}
                    <div
                        role="separator"
                        tabIndex={0}
                        aria-orientation="vertical"
                        aria-label="Resize SQL panel"
                        aria-valuenow={Math.round(width)}
                        aria-valuemin={MIN_WIDTH}
                        aria-valuemax={Math.round(window.innerWidth * MAX_WIDTH_FRACTION)}
                        onPointerDown={onResizeStart}
                        onKeyDown={onResizeKeyDown}
                        className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize bg-transparent outline-none transition-colors hover:bg-primary/40 focus-visible:bg-primary/60"
                    />
                    <aside
                        ref={panelRef}
                        // Target of the toolbar "SQL panel" toggle's `aria-controls` — toggle and
                        // panel live in separate containers, so the id is their only link.
                        id="sql-schema-panel"
                        tabIndex={-1}
                        aria-label="SQL schema"
                        className="flex h-full w-full flex-col border-l border-border bg-card outline-none"
                    >
                        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
                            <h2 className="text-sm font-semibold text-foreground">SQL</h2>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {dialectLabel(dialect)}
                            </span>
                            {dirty && (
                                <span
                                    title="Unsaved edits"
                                    aria-label="Unsaved edits"
                                    className="size-1.5 rounded-full bg-primary"
                                />
                            )}
                            <div className="flex-1" />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={copy}
                                aria-label="Copy SQL to clipboard"
                                className="gap-1.5 text-muted-foreground"
                            >
                                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <IconButton label="Close SQL panel" icon={X} onClick={onClose} />
                        </header>

                        <SqlEditor
                            value={value}
                            schema={schemaMap}
                            onChange={(next) => {
                                setEdited(next);
                                if (errors.length > 0) setErrors([]);
                            }}
                            className="min-h-0 flex-1 rounded-none border-0 [&>div]:h-full [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
                        />

                        {errors.length > 0 && (
                            <div
                                role="alert"
                                className="max-h-32 shrink-0 space-y-1 overflow-auto border-t border-border bg-destructive/10 px-3 py-2 text-xs text-destructive"
                            >
                                {errors.map((message, i) => (
                                    <p key={i}>{message}</p>
                                ))}
                            </div>
                        )}

                        <footer className="flex h-12 shrink-0 items-center gap-2 border-t border-border px-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={reset}
                                disabled={!dirty}
                                className="gap-1.5 text-muted-foreground"
                            >
                                <RotateCcw className="size-3.5" />
                Reset
                            </Button>
                            <div className="flex-1" />
                            {/* "Apply" (not "Save") — it re-parses the edited SQL and applies it to
                  the live schema; nothing is persisted. */}
                            <Button size="sm" onClick={() => void apply()} disabled={!dirty} className="gap-1.5">
                                <Check className="size-3.5" />
                Apply
                            </Button>
                        </footer>
                    </aside>
                </div>
            </div>
        </div>
    );
}
