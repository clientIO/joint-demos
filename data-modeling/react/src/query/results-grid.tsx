import { cn } from '@/utils/cn';
import { Separator } from '@/components/ui/separator';
import type { QueryResult } from '@/db/types';

interface ResultsGridProps {
  readonly result: QueryResult | null;
  readonly error?: string;
  readonly isLoading?: boolean;
}

// ── shared table shell ──────────────────────────────────────────────────────
// Rounded card that owns its own vertical scroll; header/footer stay pinned.

function GridShell({
    children,
    footer,
    busy,
}: {
  readonly children: React.ReactNode;
  readonly footer?: React.ReactNode;
  readonly busy?: boolean;
}) {
    return (
        <div
            aria-busy={busy}
            className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
        >
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
            {footer ? (
                <>
                    <Separator />
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-muted-foreground">
                        {footer}
                    </div>
                </>
            ) : null}
        </div>
    );
}

// Centered message used by every non-table state (empty / error).
function GridMessage({
    children,
    tone = 'muted',
    role,
}: {
  readonly children: React.ReactNode;
  readonly tone?: 'muted' | 'error';
  readonly role?: 'alert';
}) {
    return (
        <div
            role={role}
            className={cn(
                'flex h-full min-h-40 flex-col items-center justify-center gap-1.5 p-6 text-center text-sm',
                tone === 'error' ? 'text-status-error' : 'text-muted-foreground',
            )}
        >
            {children}
        </div>
    );
}

// ── cell ────────────────────────────────────────────────────────────────────
// Values are `unknown`; narrow at render. null/undefined read as a muted NULL,
// numbers/bigints right-align with tabular figures.

function Cell({ value }: { readonly value: unknown }) {
    const isNullish = value === null || value === undefined;
    const isNumeric = typeof value === 'number' || typeof value === 'bigint';
    return (
        <td
            className={cn(
                'max-w-[28rem] truncate border-b border-border/60 px-3 py-1.5 align-top font-mono text-xs',
                isNumeric && 'text-right tabular-nums',
            )}
            title={isNullish ? 'NULL' : String(value)}
        >
            {isNullish ? (
                <span className="italic text-muted-foreground/70">NULL</span>
            ) : (
                String(value)
            )}
        </td>
    );
}

// ── skeleton (loading) ───────────────────────────────────────────────────────

function SkeletonRows() {
    const cols = [0, 1, 2, 3];
    const rows = [0, 1, 2, 3, 4, 5, 6, 7];
    return (
        <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-secondary">
                <tr>
                    {cols.map((c) => (
                        <th key={c} className="border-b border-border px-3 py-2">
                            <div className="h-3 w-20 rounded-sm bg-muted-foreground/25" />
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="animate-pulse">
                {rows.map((r) => (
                    <tr key={r}>
                        {cols.map((c) => (
                            <td key={c} className="border-b border-border/60 px-3 py-1.5">
                                <div
                                    className="h-3 rounded-sm bg-muted-foreground/15"
                                    style={{ width: `${45 + ((r * 7 + c * 13) % 45)}%` }}
                                />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ── footer copy ──────────────────────────────────────────────────────────────

// Cap the DOM: a persistent DB + `SELECT *` can return thousands of rows, and
// mounting every <tr>×<td> at once janks the main thread. Render the first N and
// note the truncation in the footer (the full count still shows).
const MAX_RENDERED_ROWS = 500;

function footerText(result: QueryResult): string {
    const rows = `${result.rowCount} ${result.rowCount === 1 ? 'row' : 'rows'}`;
    const capped = result.rows.length > MAX_RENDERED_ROWS ? ` · showing first ${MAX_RENDERED_ROWS}` : '';
    return result.elapsedMs === undefined
        ? `${rows}${capped}`
        : `${rows}${capped} · ${result.elapsedMs.toFixed(result.elapsedMs < 10 ? 1 : 0)}ms`;
}

// ── public component ─────────────────────────────────────────────────────────

export function ResultsGrid({ result, error, isLoading }: ResultsGridProps) {
    if (error !== undefined) {
        return (
            <GridShell>
                <GridMessage tone="error" role="alert">
                    <span className="font-medium">Query failed</span>
                    <span className="max-w-prose whitespace-pre-wrap font-mono text-xs text-status-error">
                        {error}
                    </span>
                </GridMessage>
            </GridShell>
        );
    }

    if (isLoading) {
        return (
            <GridShell busy>
                <SkeletonRows />
            </GridShell>
        );
    }

    if (result === null) {
        return (
            <GridShell>
                <GridMessage>
                    <span className="font-medium text-foreground/80">No results yet</span>
                    <span>Run a query to see rows here.</span>
                </GridMessage>
            </GridShell>
        );
    }

    if (result.rows.length === 0) {
        return (
            <GridShell footer={footerText(result)}>
                <GridMessage>
                    <span className="font-medium text-foreground/80">No rows returned</span>
                    <span>The query ran successfully but matched no rows.</span>
                </GridMessage>
            </GridShell>
        );
    }

    return (
        <GridShell footer={footerText(result)}>
            <table className="w-max min-w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-secondary text-secondary-foreground">
                    <tr>
                        {result.columns.map((col, c) => (
                            <th
                                key={c}
                                scope="col"
                                className="whitespace-nowrap border-b border-border px-3 py-2 font-mono text-xs font-semibold"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {result.rows.slice(0, MAX_RENDERED_ROWS).map((row, r) => (
                        <tr
                            key={r}
                            className="transition-colors odd:bg-transparent even:bg-muted/40 hover:bg-accent"
                        >
                            {result.columns.map((_col, c) => (
                                <Cell key={c} value={row[c]} />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </GridShell>
    );
}
