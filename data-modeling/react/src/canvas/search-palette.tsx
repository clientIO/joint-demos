// Non-modal search overlay (⌘/Ctrl+K, or the toolbar search button) to locate a
// table, group or column and jump to it. It floats over the canvas WITHOUT dimming
// it — a modal would hide the very thing being searched — so matches light up live
// on the board as you type, and the currently-highlighted result glows strongest.
// On pick it frames the cell (animated pan + zoom via transitionToRect) and selects
// it, so a dense diagram stays navigable.
//
// The live highlight is a JSX <style> derived from the results DURING RENDER (React
// renders it into the document) — no injected DOM, no effect, no ref. Targeting the
// cell by `[model-id]` is the sanctioned lever (the cards render inside joint's
// per-cell <g>, which carries model-id): tables/notes expose `[data-node-card]`,
// group bodies an SVG `<rect>`. Corpus comes from useSchema (structurally stable).

import { useMemo, useState } from 'react';
import { Boxes, Columns3, Search, Table2, X } from 'lucide-react';
import { useGraph, usePaperScroller, useSelectionCollection } from '@joint/react-plus';
import { useSchema } from '@/model/use-schema';
import { cn } from '@/utils/cn';

type EntryKind = 'table' | 'group' | 'column';

interface Entry {
  readonly kind: EntryKind;
  readonly cellId: string; // the cell to frame/select (a column targets its table)
  readonly label: string;
  readonly hint?: string; // schema / owning table
  readonly search: string; // pre-lowercased haystack
}

const ICON: Record<EntryKind, typeof Table2> = {
    table: Table2,
    group: Boxes,
    column: Columns3,
};

// Coral highlight for every match; a stronger ring + glow for the active one, so the
// result Enter will jump to is obvious on the board. `!important` beats the cards' own
// selection/hover outlines; the group rect gets a matching coral stroke.
function highlightCss(
    matchIds: readonly string[],
    activeId: string | undefined,
): string {
    if (matchIds.length === 0) return '';
    const cards = matchIds
        .map((id) => `[model-id="${CSS.escape(id)}"] [data-node-card]`)
        .join(',');
    const rects = matchIds
        .map((id) => `[model-id="${CSS.escape(id)}"] > rect`)
        .join(',');
    const rules = [
        `${cards}{outline:2px solid var(--primary)!important;outline-offset:2px!important;border-radius:10px;box-shadow:0 0 0 4px color-mix(in oklch,var(--primary) 18%,transparent)!important;transition:box-shadow .15s,outline-width .15s}`,
        `${rects}{stroke:var(--primary)!important;stroke-width:2px!important}`,
    ];
    if (activeId !== undefined) {
        const cellId = CSS.escape(activeId);
        rules.push(
            `[model-id="${cellId}"] [data-node-card]{outline-width:3px!important;box-shadow:0 0 0 6px color-mix(in oklch,var(--primary) 30%,transparent)!important}`,
            `[model-id="${cellId}"] > rect{stroke-width:3px!important}`,
        );
    }
    return rules.join('');
}

// Mounted only while open (CanvasArea renders it conditionally), so its query state
// resets each open and the <style> highlight exists only while searching.
export function SearchPalette({ onClose }: { readonly onClose: () => void }) {
    const schema = useSchema();
    const { graph } = useGraph();
    const { paperScroller } = usePaperScroller();
    const { selectCells } = useSelectionCollection();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);

    const entries = useMemo<Entry[]>(() => {
        const list: Entry[] = [];
        for (const group of schema.groups) {
            list.push({
                kind: 'group',
                cellId: group.id,
                label: group.name,
                search: group.name.toLowerCase(),
            });
        }
        for (const table of schema.tables) {
            list.push({
                kind: 'table',
                cellId: table.id,
                label: table.name,
                hint: table.schema,
                search:
          `${table.schema ? `${table.schema}.` : ''}${table.name}`.toLowerCase(),
            });
            for (const column of table.columns) {
                list.push({
                    kind: 'column',
                    cellId: table.id, // no column cell — jump to the owning table
                    label: column.name,
                    hint: table.name,
                    search: `${table.name}.${column.name}`.toLowerCase(),
                });
            }
        }
        return list;
    }, [schema]);

    const q = query.trim().toLowerCase();
    const results = useMemo(() => {
    // Token AND-match: every whitespace-separated word must appear in the haystack,
    // in ANY order. So "users id" matches the `users.id` column (haystack "users.id")
    // even though "users id" isn't a literal substring of it — the natural way people
    // type "<table> <column>".
        const tokens = q.split(/\s+/).filter(Boolean);
        const matched =
      tokens.length === 0
          ? entries
          : entries.filter((entry) => tokens.every((token) => entry.search.includes(token)));
        return matched.slice(0, 50); // keep a big import snappy
    }, [entries, q]);

    const clampedActive = Math.min(active, Math.max(0, results.length - 1));
    // Highlight only while actually searching (a blank query = a browse list, no board
    // noise). De-duped since many column rows can point at the same table cell.
    const matchIds =
    q === '' ? [] : [...new Set(results.map((entry) => entry.cellId))];
    const activeId = q === '' ? undefined : results[clampedActive]?.cellId;

    function jumpTo(entry: Entry | undefined): void {
        if (!entry) return;
        const element = graph.getCell(entry.cellId);
        if (element?.isElement()) {
            // Frame the cell: animate BOTH pan and zoom. maxScale 1 stops a tiny table
            // over-zooming; visibility < 1 leaves padding around it.
            paperScroller?.transitionToRect(element.getBBox(), {
                maxScale: 1,
                minScale: 0.4,
                visibility: 0.65,
                // Snappy but smooth (default feels sluggish).
                duration: '250ms',
                timingFunction: 'ease-out',
            });
        }
        selectCells([entry.cellId]);
        onClose();
    }

    return (
        <>
            <style>{highlightCss(matchIds, activeId)}</style>
            {/* Rendered inside the toolbar search field's relative wrapper, so on desktop it
          drops straight below the field with left edges aligned — opening the field
          visually expands it into this panel. On mobile (where the field is tiny) it
          falls back to a fixed, centered overlay so the results stay legible. */}
            <div
                role="dialog"
                aria-label="Search the diagram"
                className={cn(
                    'z-50 overflow-hidden rounded-xl border border-border bg-popover node-elevation focus-within:ring-1 focus-within:ring-primary/40 motion-safe:animate-[search-fade_0.12s_ease-out]',
                    'fixed left-1/2 top-20 w-[min(30rem,92vw)] -translate-x-1/2',
                    'lg:absolute lg:left-0 lg:top-full lg:mt-4 lg:w-120 lg:translate-x-0',
                )}
            >
                <div className="flex items-center gap-2 border-b border-border px-3">
                    <Search
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                    />
                    <input
                        autoFocus
                        role="combobox"
                        aria-expanded
                        aria-controls="search-results"
                        aria-activedescendant={
                            results[clampedActive] ? `search-opt-${clampedActive}` : undefined
                        }
                        aria-label="Search tables, groups and columns"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActive(0);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                setActive((index) => Math.min(index + 1, results.length - 1));
                            } else if (event.key === 'ArrowUp') {
                                event.preventDefault();
                                setActive((index) => Math.max(index - 1, 0));
                            } else if (event.key === 'Enter') {
                                event.preventDefault();
                                jumpTo(results[clampedActive]);
                            } else if (event.key === 'Escape') {
                                event.preventDefault();
                                onClose();
                            }
                        }}
                        placeholder="Search tables, groups, columns…"
                        className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {query ? (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {results.length}
                        </span>
                    ) : (
                        <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground sm:inline">
              esc
                        </kbd>
                    )}
                    <button
                        type="button"
                        aria-label="Close search"
                        onClick={onClose}
                        className="shrink-0 rounded-sm p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                {/* Options are DIRECT children of the listbox (no ul/li): a role="listbox"
            voids native list semantics, so wrapping options in <li> orphaned both
            (aria-required-parent / listitem). The empty state is a disabled option so
            the listbox still has a valid child. */}
                <div
                    id="search-results"
                    className="max-h-72 overflow-auto p-1.5"
                    role="listbox"
                    aria-label="Search results"
                >
                    {results.length === 0 ? (
                        <div
                            role="option"
                            aria-disabled
                            aria-selected={false}
                            className="px-3 py-6 text-center text-sm text-muted-foreground"
                        >
              No matches
                        </div>
                    ) : (
                        results.map((entry, index) => {
                            const Icon = ICON[entry.kind];
                            return (
                                <button
                                    key={`${entry.kind}-${entry.cellId}-${entry.label}-${index}`}
                                    type="button"
                                    id={`search-opt-${index}`}
                                    role="option"
                                    aria-selected={index === clampedActive}
                                    onClick={() => jumpTo(entry)}
                                    onMouseMove={() => setActive(index)}
                                    className={cn(
                                        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm outline-none',
                                        index === clampedActive
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-foreground',
                                    )}
                                >
                                    <Icon
                                        className="size-4 shrink-0 text-muted-foreground"
                                        aria-hidden
                                    />
                                    <span className="truncate font-mono">
                                        {entry.label || '(unnamed)'}
                                    </span>
                                    {entry.hint ? (
                                        <span className="truncate text-xs text-muted-foreground">
                                            {entry.hint}
                                        </span>
                                    ) : null}
                                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                                        {entry.kind}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}
