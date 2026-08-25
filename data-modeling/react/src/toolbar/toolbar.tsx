// The app's top chrome: brand, draw-to-create tools, undo/redo, a dialect
// switcher, import/export, and the SQL + query panel toggles. It lives inside
// <Diagram> (wrapped in DialectProvider + AddToolProvider), so it reads the graph
// and shared state straight from the react-plus / context hooks. Panel and dialog
// OPEN state is owned by the app and driven through the callback props below.

import { memo, useEffect, useRef, useState } from 'react';
import {
    Code2,
    Download,
    Eraser,
    ImageDown,
    Moon,
    Play,
    Redo2,
    Search,
    Sun,
    Undo2,
    Upload,
    type LucideIcon,
} from 'lucide-react';
import {
    useGraphHistory,
    useGraphHistoryStack,
    useImageExport,
    useOnKeyboardEvents,
} from '@joint/react-plus';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/use-theme';
import { useDialect } from '@/context/dialect-context';
import { useAddTool, type AddTool } from '@/context/add-tool-context';
import { useSchema } from '@/model/use-schema';
import { generateDdl } from '@/schema/generate-ddl';
import { formatSql } from '@/schema/format-sql';
import { downloadText } from '@/utils/download';
// Imported (not a hardcoded "/…" src) so Vite emits a base-relative URL — otherwise
// the logo 404s when the built dist is served from a sub-path.
import jointjsLogo from '@/assets/jointjs-logo.svg';
import { cn } from '@/utils/cn';
import { SearchPalette } from '@/canvas/search-palette';
import { DialectSwitcher, MoreMenu, OverflowMenu } from './toolbar-controls';
import { ACTIVE, TOOLS } from './toolbar-tools';

interface ToolbarProps {
  readonly onOpenImport: () => void;
  readonly onOpenSearch: () => void;
  readonly searchOpen: boolean;
  readonly onCloseSearch: () => void;
  readonly onClear: () => void;
  readonly sqlPanelOpen: boolean;
  readonly onToggleSqlPanel: () => void;
  readonly queryPanelOpen: boolean;
  readonly onToggleQueryPanel: () => void;
}

// memo'd (with stable callback props from the app) so the per-frame controlled-cells
// cascade during a drag doesn't reconcile the whole toolbar + all its tooltips.
export const Toolbar = memo(function Toolbar({
    onOpenImport,
    onOpenSearch,
    searchOpen,
    onCloseSearch,
    onClear,
    sqlPanelOpen,
    onToggleSqlPanel,
    queryPanelOpen,
    onToggleQueryPanel,
}: ToolbarProps) {
    const { theme, toggle } = useTheme();
    const { dialect, setDialect } = useDialect();
    const { armed, arm, disarm } = useAddTool();
    const { undo, redo } = useGraphHistory();
    const { canUndo, canRedo } = useGraphHistoryStack();
    // Structural schema (position-stable) — export is the only consumer, and it must
    // not re-render the whole toolbar on every drag-frame position commit.
    const schema = useSchema();
    const isDark = theme === 'dark';
    // The destructive Clear confirm is owned here (not in a ClearButton) so BOTH the desktop
    // icon and the mobile "More" menu item route through one deliberate confirm dialog.
    const [clearConfirm, setClearConfirm] = useState(false);
    // Wraps both the trigger field and the panel, so the outside-click check can treat
    // clicks on either as "inside".
    const searchAnchorRef = useRef<HTMLDivElement>(null);

    // Toolbar shortcuts on the Diagram's keyboard (ui.Keyboard): ⌘/Ctrl+K opens
    // search, T / G / N arm a tool. The keyboard already ignores keys typed into
    // inputs/selects/textareas/contenteditable, and its bindings encode the
    // modifier state (a bare `t` can never fire on ⌘T), so one plain entry per
    // shortcut is the whole implementation.
    useOnKeyboardEvents({
        'ctrl+k command+k': (event) => {
            event.preventDefault();
            onOpenSearch();
        },
        t: (event) => {
            event.preventDefault();
            arm('table');
        },
        g: (event) => {
            event.preventDefault();
            arm('group');
        },
        n: (event) => {
            event.preventDefault();
            arm('note');
        },
    });

    // Close the search overlay on any pointer-down outside its wrapper (trigger + panel).
    useEffect(() => {
        if (!searchOpen) return;
        function onPointerDown(event: PointerEvent): void {
            const anchor = searchAnchorRef.current;
            const target = event.target;
            if (anchor && target instanceof Node && !anchor.contains(target)) onCloseSearch();
        }
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [searchOpen, onCloseSearch]);

    // Toggling an already-armed tool disarms it.
    function toggleTool(tool: AddTool): void {
        if (armed === tool) disarm();
        else arm(tool);
    }

    function onExport(): void {
        const ddl = generateDdl(schema, dialect);
        downloadText('schema.sql', formatSql(ddl, dialect), 'application/sql');
    }

    // Diagram-as-image export via the library hook: renders the paper content to a
    // PNG (padding keeps a margin around the outermost cards) and downloads it.
    const [exportImage] = useImageExport({ type: 'image/png', padding: 24 });
    function onExportPng(): void {
        void exportImage({ downloadAs: 'schema' });
    }

    return (
        <header className="relative z-40 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
            <div className="flex items-center gap-2 pr-1">
                <img src={jointjsLogo} alt="JointJS" className="h-5 w-auto shrink-0" />
                <span className="hidden text-sm font-semibold text-foreground sm:inline">
          Data Modeling
                </span>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Middle groups — inline on wide screens, folded into an overflow menu below. */}
            <div className="hidden items-center gap-1 lg:flex">
                {TOOLS.map((spec) => (
                    <ToggleButton
                        key={spec.tool}
                        label={spec.label}
                        shortcut={spec.shortcut}
                        icon={spec.icon}
                        pressed={armed === spec.tool}
                        onClick={() => toggleTool(spec.tool)}
                    />
                ))}
                <Separator orientation="vertical" className="mx-1 h-6" />
                <IconButton
                    label="Undo"
                    icon={Undo2}
                    onClick={undo}
                    disabled={!canUndo}
                />
                <IconButton
                    label="Redo"
                    icon={Redo2}
                    onClick={redo}
                    disabled={!canRedo}
                />
            </div>
            <div className="lg:hidden">
                <OverflowMenu
                    armed={armed}
                    onArm={toggleTool}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                />
            </div>

            {/* Search (⌘K): a compact trigger field. Its relative wrapper anchors the panel,
          which opens directly below it (see SearchPalette) so the field appears to
          expand into the results — and holds it for the outside-click-to-close check. */}
            <div ref={searchAnchorRef} className="relative">
                <button
                    type="button"
                    onClick={onOpenSearch}
                    // Accessible name is EXACTLY the visible label ("Search") — the strictest form
                    // of WCAG 2.5.3 Label in Name. The button's ONLY visible text is "Search": no
                    // ⌘K hint here, because it renders visibly and voice-control scanners
                    // (accessibilitychecker.org) count ALL visible text as the label regardless of
                    // aria-hidden — so a visible "Search ⌘K" against an accessible name "Search"
                    // reads as a mismatch even though axe (which honours aria-hidden) passes it.
                    // The shortcut stays discoverable via aria-keyshortcuts (AT) + the tooltip.
                    aria-label="Search"
                    aria-keyshortcuts="Meta+K Control+K"
                    aria-expanded={searchOpen}
                    // Icon-only square on phones (the full field would crowd out everything else),
                    // expanding to the labelled search field from md up.
                    className="flex h-8 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring size-8 md:w-[min(12rem,20vw)] md:justify-start md:px-2.5"
                >
                    <Search className="size-4 shrink-0" aria-hidden />
                    <span className="hidden truncate md:inline">Search</span>
                </button>
                {searchOpen ? <SearchPalette onClose={onCloseSearch} /> : null}
            </div>

            <div className="flex-1" />

            {/* Full right cluster on lg+; below that it folds into the MoreMenu so the phone
          toolbar can't overflow (which would make the whole page scroll sideways). */}
            <div className="hidden items-center gap-2 lg:flex">
                <DialectSwitcher dialect={dialect} onChange={setDialect} />
                <Separator orientation="vertical" className="mx-1 h-6" />
                <IconButton label="Import SQL" icon={Upload} onClick={onOpenImport} />
                <IconButton label="Export SQL" icon={Download} onClick={onExport} />
                <IconButton label="Export PNG" icon={ImageDown} onClick={onExportPng} />
                <IconButton label="Clear canvas" icon={Eraser} onClick={() => setClearConfirm(true)} />
                <Separator orientation="vertical" className="mx-1 h-6" />
                <ToggleButton
                    label="SQL panel"
                    icon={Code2}
                    variant="secondary"
                    pressed={sqlPanelOpen}
                    expanded={sqlPanelOpen}
                    controls={sqlPanelOpen ? 'sql-schema-panel' : undefined}
                    onClick={onToggleSqlPanel}
                />
            </div>

            {/* Run query — the primary CTA, always on the bar. */}
            <ToggleButton
                label="Run query"
                icon={Play}
                variant="default"
                pressed={queryPanelOpen}
                expanded={queryPanelOpen}
                controls={queryPanelOpen ? 'query-runner-panel' : undefined}
                onClick={onToggleQueryPanel}
            />

            {/* Theme lives inline on lg+ and inside the MoreMenu on mobile. */}
            <Separator orientation="vertical" className="mx-1 hidden h-6 lg:block" />
            <div className="hidden lg:block">
                <IconButton
                    label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    icon={isDark ? Sun : Moon}
                    onClick={toggle}
                />
            </div>

            {/* Mobile: the folded right cluster. */}
            <div className="lg:hidden">
                <MoreMenu
                    dialect={dialect}
                    onDialect={setDialect}
                    sqlPanelOpen={sqlPanelOpen}
                    onToggleSqlPanel={onToggleSqlPanel}
                    onOpenImport={onOpenImport}
                    onExport={onExport}
                    onExportPng={onExportPng}
                    onRequestClear={() => setClearConfirm(true)}
                    isDark={isDark}
                    onToggleTheme={toggle}
                />
            </div>

            {/* Shared destructive-clear confirm (desktop icon + mobile menu both open it). */}
            <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Clear the canvas?</DialogTitle>
                        <DialogDescription>
              This removes every table, group, note and relationship so you can start from
              scratch. You can undo it with {undoShortcut()}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setClearConfirm(false)}>
              Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                onClear();
                                setClearConfirm(false);
                            }}
                        >
              Clear canvas
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    );
});

// The platform's undo shortcut label (⌘Z on Mac, Ctrl+Z elsewhere).
function undoShortcut(): string {
    return typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform)
        ? '⌘Z'
        : 'Ctrl+Z';
}

// A ghost icon button that reflects a pressed/toggled state (aria-pressed +
// coral fill), with a tooltip that can carry a keyboard shortcut. Composes the
// same Button + Tooltip primitives as IconButton, which has no toggle affordance.
function ToggleButton({
    label,
    shortcut,
    icon: Icon,
    pressed,
    expanded,
    controls,
    onClick,
    variant = 'ghost',
}: {
  readonly label: string;
  readonly shortcut?: string;
  readonly icon: LucideIcon;
  readonly pressed: boolean;
  readonly expanded?: boolean;
  // Id of the panel this toggle opens. The panel renders in a DIFFERENT container
  // (the main area, not the toolbar), so `aria-controls` is what tells assistive tech
  // which region `aria-expanded` refers to. Pass it only while open, so a closed panel
  // (which isn't in the DOM) leaves no dangling reference.
  readonly controls?: string;
  readonly onClick: () => void;
  // A COLORED variant (default = primary, secondary) turns the toggle into a call-to-
  // action so the toolbar reads a next step; the ghost default leaves the rest untouched.
  readonly variant?: React.ComponentProps<typeof Button>['variant'];
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant={variant}
                    size="icon"
                    aria-label={label}
                    aria-pressed={pressed}
                    aria-expanded={expanded}
                    aria-controls={controls}
                    onClick={onClick}
                    // A colored CTA is trimmed slightly smaller than the 36px ghost buttons (size-8,
                    // softer rounded-lg, no raised shadow) so it reads as a refined accent chip in the
                    // flat toolbar rather than a chunky filled square. The focus ring is OFFSET by the
                    // page background so the coral ring reads against the fill (an inset coral-on-coral
                    // ring was invisible). Ghost buttons show the light primary-tint "active" wash when
                    // open; a colored CTA keeps its fill and gets a subtle inset ring so it still reads as on.
                    className={cn(
                        variant !== 'ghost' &&
              'size-8 rounded-lg shadow-none focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        pressed && (variant === 'ghost' ? ACTIVE : 'ring-2 ring-inset ring-primary-foreground/50'),
                    )}
                >
                    <Icon className="size-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
                {label}
                {shortcut === undefined ? null : (
                    <kbd className="rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                        {shortcut}
                    </kbd>
                )}
            </TooltipContent>
        </Tooltip>
    );
}
