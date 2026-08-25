// App shell. The <Diagram> (graph + controlled cells) lives at the root so the
// toolbar and side panels are siblings of the canvas and share the same graph via
// the react-plus hooks. `cells` is the single source of truth; every edit flows
// back through setCells.
//
// AddToolProvider sits ABOVE <Diagram> so the Workspace can disable the paper's
// built-in PaperScroller pan/zoom (`interactions.paperScroller`) while a
// draw-to-create tool is armed — otherwise a blank drag pans the paper instead of
// drawing the new node. (`paperScroller` is the master switch that gates blank-drag
// pan; there is no `enabled` field.)

import { useCallback, useState } from 'react';
import { Diagram } from '@joint/react-plus';
import { INITIAL_NOTES, INITIAL_SCHEMA } from './model/initial-schema';
import { schemaToCells } from './model/schema-cells';
import { normalizePastedCells } from './model/normalize-cells';
import { applySqlSchema } from './model/apply-sql-schema';
import { isGroupCell, type Cell, type SwatchKey } from './model/cell-data';
import type { Schema } from './schema/types';
import { withRelationStyle } from './canvas/paper-config';
import { useSqlEngine } from './hooks/use-sql-engine';
import { CanvasArea } from './canvas/canvas';
import { TableInspector } from './inspector/table-inspector';
import { GroupInspector } from './inspector/group-inspector';
import { RightSqlPanel } from './panels/right-sql-panel';
import { QueryPanel } from './panels/query-panel';
import { Toolbar } from './toolbar/toolbar';
import { ImportDialog } from './data-io/import-dialog';
import { DialectProvider } from './context/dialect-provider';
import { AddToolProvider } from './context/add-tool-provider';
import { useAddTool } from './context/add-tool-context';
import { AnnouncerProvider } from './components/ui/announcer';
import { LinkDraftProvider } from './context/link-draft-provider';
import { HoverProvider } from './context/hover-provider';

// Presentation swatches for the seed groups (so the inspector picker matches on
// first open and the badges are on-brand). Keyed by the seed group ids.
const SEED_GROUP_APPEARANCE: Readonly<
  Record<string, { readonly fill?: SwatchKey; readonly badge?: SwatchKey }>
> = {
    grp_identity: { badge: 'blue' },
    grp_product: { badge: 'green' },
};

function seedCells(): Cell[] {
    return schemaToCells(INITIAL_SCHEMA, INITIAL_NOTES)
        .map(withRelationStyle)
        .map((cell): Cell => {
            // Narrow to the element branch first so the spread stays a typed element.
            if (cell.type !== 'element' || !isGroupCell(cell.data)) return cell;
            const appearance = typeof cell.id === 'string' ? SEED_GROUP_APPEARANCE[cell.id] : undefined;
            return appearance ? { ...cell, data: { ...cell.data, ...appearance }} : cell;
        });
}

function Workspace() {
    // Armed drives whether the paper's pan/zoom is on: while a tool is armed, the
    // canvas's draw-to-create must own the blank drag.
    const { armed } = useAddTool();
    const [cells, setCells] = useState<readonly Cell[]>(seedCells);
    // Every graph edit flows through here. `normalizePastedCells` repairs the
    // identity of clipboard-pasted tables (fresh column ids, unique name — see
    // model/normalize-cells.ts); it's identity-preserving for clean commits, so
    // the common path stays a pass-through.
    const handleCellsChange = useCallback(
        (next: readonly Cell[]) => setCells(normalizePastedCells(next)),
        [],
    );
    const [importOpen, setImportOpen] = useState(false);
    const [sqlPanelOpen, setSqlPanelOpen] = useState(false);
    const [queryPanelOpen, setQueryPanelOpen] = useState(false);
    // Search overlay open state — shared so the toolbar button and the in-canvas
    // ⌘/Ctrl+K handler both drive the one palette (which lives in CanvasArea).
    const [searchOpen, setSearchOpen] = useState(false);
    // Query-panel height lives here so the canvas can lift the minimap above it.
    const [queryHeight, setQueryHeight] = useState(320);
    // SQL-panel width lives here so it survives closing + reopening the panel.
    const [sqlPanelWidth, setSqlPanelWidth] = useState(380);
    // The SQL engine lives at app scope (NOT inside QueryPanel) so its in-browser
    // database SURVIVES closing + reopening the panel — otherwise unmounting the panel
    // disposed the DB and every inserted row was lost. Still lazy: no engine/WASM is
    // created until the first query runs.
    const sqlEngine = useSqlEngine();
    // INSERT statements carried by the last import (a dump like Chinook ships data) —
    // the query runner seeds them after the DDL so queries hit real rows.
    const [importedData, setImportedData] = useState('');

    // Import (from a file) replaces the canvas with the parsed schema, laid out +
    // styled like the seed; the dump's data rides along for the query runner. (The
    // animated fit-to-content afterwards lives in ImportDialog — it renders INSIDE
    // <Diagram>, where the paper-scroller context resolves; Workspace is above it.)
    function importSchema(schema: Schema, dataSql: string): void {
        setCells(schemaToCells(schema).map(withRelationStyle));
        setImportedData(dataSql);
    }

    // Applying EDITED SQL is non-destructive: SQL can't express groups/notes/layout,
    // so we keep them and only let the parsed schema drive tables + relations.
    function applySqlEdits(schema: Schema): void {
        setCells((current) => applySqlSchema(current, schema).map(withRelationStyle));
    }

    // Stable identities for the memo'd Toolbar's props (setState setters are stable),
    // so the per-frame controlled-cells cascade doesn't defeat its memo during a drag.
    const openImport = useCallback(() => setImportOpen(true), []);
    const toggleSqlPanel = useCallback(() => setSqlPanelOpen((open) => !open), []);
    const toggleQueryPanel = useCallback(() => setQueryPanelOpen((open) => !open), []);
    // Clear the whole canvas (the toolbar guards this behind a confirmation dialog).
    // Imported data goes with it — an empty schema has no tables for the rows.
    const clearCanvas = useCallback(() => {
        setCells([]);
        setImportedData('');
    }, []);
    const openSearch = useCallback(() => setSearchOpen(true), []);
    const closeSearch = useCallback(() => setSearchOpen(false), []);

    return (
        <Diagram
            cells={cells}
            onCellsChange={handleCellsChange}
            history
            clipboard
            // Quad-tree spatial index (dia.SearchGraph): containment embedding and
            // draw-to-place hit-test via graph.findElementsAtPoint, so a big import
            // (159-table pg_dump) stays a tree lookup instead of a linear scan.
            spatialIndex
            // `commandManager: false` disables react-plus's OWN Cmd/Ctrl+Z undo-redo keyboard
            // shortcut — useCanvasTools already binds it (with a11y announcements + typing-field
            // guards), and both firing on one press undid TWICE. History (buttons + our handler)
            // still works; this only drops the library's duplicate keyboard binding.
            interactions={{ paperScroller: armed === null, commandManager: false }}
        >
            <AnnouncerProvider>
                <HoverProvider>
                    <LinkDraftProvider>
                        <div className="flex h-full flex-col overflow-x-hidden bg-background">
                            <Toolbar
                                onOpenImport={openImport}
                                onOpenSearch={openSearch}
                                searchOpen={searchOpen}
                                onCloseSearch={closeSearch}
                                onClear={clearCanvas}
                                sqlPanelOpen={sqlPanelOpen}
                                onToggleSqlPanel={toggleSqlPanel}
                                queryPanelOpen={queryPanelOpen}
                                onToggleQueryPanel={toggleQueryPanel}
                            />
                            {/* Page heading for assistive tech — inside <main> so it sits within a
            landmark region (a stray sr-only h1 outside all landmarks trips the
            WCAG "content in landmarks" check). */}
                            <main className="relative flex min-h-0 flex-1 overflow-hidden">
                                <h1 className="sr-only">JointJS Data Modeling</h1>
                                <div className="relative flex min-w-0 flex-1 flex-col">
                                    <div className="relative min-h-0 flex-1">
                                        <CanvasArea />
                                        {/* Inspector overlays the CANVAS only: it's absolute inside THIS relative
                  wrapper, so (a) selecting a cell never resizes the canvas (boss's ask)
                  and (b) opening the RightSqlPanel — a flex sibling of the canvas column —
                  is never hidden behind it. */}
                                        <TableInspector />
                                        <GroupInspector />
                                    </div>
                                    {/* Mounted only while open: keeps the heavy CodeMirror chunk + the
                per-frame useSchema derivation out of the initial load and off the
                drag path when the runner is closed. */}
                                    {queryPanelOpen ? (
                                        <QueryPanel
                                            open={queryPanelOpen}
                                            engine={sqlEngine}
                                            seedData={importedData}
                                            height={queryHeight}
                                            onHeightChange={setQueryHeight}
                                            onClose={() => setQueryPanelOpen(false)}
                                        />
                                    ) : null}
                                </div>
                                {/* Mounted only while open (like the query runner): keeps CodeMirror +
              useSchema lazy. The panel owns its grid-track slide + left-edge resize. */}
                                {sqlPanelOpen ? (
                                    <RightSqlPanel
                                        open={sqlPanelOpen}
                                        width={sqlPanelWidth}
                                        onWidthChange={setSqlPanelWidth}
                                        onClose={() => setSqlPanelOpen(false)}
                                        onApply={applySqlEdits}
                                    />
                                ) : null}
                            </main>
                        </div>
                        <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={importSchema} />
                    </LinkDraftProvider>
                </HoverProvider>
            </AnnouncerProvider>
        </Diagram>
    );
}

export function App() {
    return (
        <AddToolProvider>
            <DialectProvider>
                <Workspace />
            </DialectProvider>
        </AddToolProvider>
    );
}
