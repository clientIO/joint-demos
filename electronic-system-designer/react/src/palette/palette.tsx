// The component library — a left rail built on the HEADLESS react-plus
// <Stencil>: the component brings JointJS's drag-and-drop machinery (clone
// preview, grid snap, drop animation, invalid-drop bounce), we bring the UI.
//
// The rail is view-aware: the ARCHITECTURE palette offers reusable subsystem
// templates; the CONNECTIVITY palette offers leaf parts from the catalog.
// Both are searchable, and every row also works without a pointer —
// Enter/Space places the item at the viewport center through a store action.

import { useDeferredValue, useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Stencil, usePaperScroller, useSelectionCollection, useStencil } from '@joint/react-plus';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Search, X } from 'lucide-react';
import {
    CATEGORY_LABEL,
    getPart,
    IFACE_LABEL,
    PART_CATALOG,
    type PartCategory,
    type PartDef,
} from '@/model/catalog';
import { boardName, newId } from '@/model/design';
import { useDesignerStore, type ViewId } from '@/state/designer-store';
import { useAnnouncer } from '@/components/ui/announcer-context';
import { PartSymbol } from '@/symbols/part-symbol';
import { SUBSYSTEM_TEMPLATES, type SubsystemTemplate } from '@/views/subsystem-templates';
import type { Cell } from '@/views/cell-data';

/**
 * WORKAROUND — react-plus `StencilView.startDragging` inlines the upstream
 * `ui.Stencil#startDragging`/`preparePaperForDragging` pair (to defer sizing
 * until the React portal has rendered) but drops the upstream `showPopover()`
 * promotion. The drag paper still carries `popover="manual"`, and the browser
 * keeps a never-shown popover at `display: none` — so the drag ghost renders
 * fully yet stays invisible. Re-promote it ourselves once the drag starts
 * (and on every drag move, in case anything closes it mid-flight).
 */
function revealDragGhost(): void {
    const layer = document.querySelector('body > .jj-stencil-paper');
    if (layer instanceof HTMLElement && layer.isConnected && !layer.matches(':popover-open')) {
        try {
            layer.showPopover();
        } catch {
            // Popover API unavailable or the layer is mid-teardown — nothing to do.
        }
    }
}

/** The element record a palette row hands to the stencil drag. The drop
 * clones it (fresh cell id) but keeps `data` verbatim — the write-back mints
 * the real domain object from that payload. */
function mintPartDrop(part: PartDef): Cell {
    return {
        id: newId('drop'),
        type: 'element',
        size: { width: part.size.width, height: part.size.height },
        data: { kind: 'palette-part', part: part.id },
    };
}

function mintTemplateDrop(template: SubsystemTemplate): Cell {
    return {
        id: newId('drop'),
        type: 'element',
        size: { width: 196, height: 132 },
        data: { kind: 'palette-subsystem', template: template.id },
    };
}

/** Geometry-only thumbnail of a part symbol. */
function PartThumb({ part }: { readonly part: PartDef }) {
    const { width, height } = part.size;
    return (
        <svg
            viewBox={`-18 -18 ${width + 36} ${height + 36}`}
            // Names and numbers are unreadable smudges at thumbnail scale.
            className="esd-thumb h-9 w-9 [&_.esd-part-footprint]:hidden [&_.esd-part-name]:hidden [&_.esd-pin-name]:hidden [&_.esd-pin-number]:hidden [&_.esd-ref]:hidden"
            aria-hidden
            focusable={false}
        >
            <PartSymbol part={part} refLabel="" />
        </svg>
    );
}

/** Differential-bus mini icon: two labelled signal lines with arrowheads. */
function BusArrowsThumb({
    labels,
    bidirectional,
}: {
  readonly labels: readonly [string, string];
  readonly bidirectional: boolean;
}) {
    return (
        <svg viewBox="0 0 44 44" className="esd-thumb esd-thumb-mini h-9 w-9" aria-hidden focusable={false}>
            {labels.map((label, index) => {
                const y = 16 + index * 13;
                return (
                    <g key={label}>
                        <text x={4} y={y + 3.5} fontSize={9} fontFamily="var(--font-mono)" fill="currentColor">
                            {label}
                        </text>
                        <line className="esd-stroke" x1={15} y1={y} x2={35} y2={y} />
                        <path className="esd-fill" d={`M40,${y} l-6,-3.2 v6.4 z`} />
                        {bidirectional ? <path className="esd-fill" d={`M15,${y} l6,-3.2 v6.4 z`} /> : null}
                    </g>
                );
            })}
        </svg>
    );
}

/** Thermometer mini icon for the sensor daughterboard. */
function ThermometerThumb() {
    return (
        <svg viewBox="0 0 44 44" className="esd-thumb esd-thumb-mini h-9 w-9" aria-hidden focusable={false}>
            <rect className="esd-stroke" x={18.5} y={5} width={7} height={22} rx={3.5} fill="none" />
            <circle className="esd-stroke" cx={22} cy={33} r={6.5} fill="none" />
            <rect className="esd-fill" x={20.5} y={18} width={3} height={12} />
            <circle className="esd-fill" cx={22} cy={33} r={3.2} />
            <line className="esd-stroke" x1={29} y1={10} x2={32} y2={10} />
            <line className="esd-stroke" x1={29} y1={15} x2={32} y2={15} />
            <line className="esd-stroke" x1={29} y1={20} x2={32} y2={20} />
        </svg>
    );
}

/**
 * One STANDARD icon per subsystem template (the spec mock draws semantic
 * icons, not a generic block): real part symbols where the schematic already
 * owns the right glyph, purpose-made minis for the rest. The switch is
 * exhaustive on the template id — adding a template forces an icon choice.
 */
function TemplateThumb({ template }: { readonly template: SubsystemTemplate }) {
    switch (template.id) {
        case 'dc-input':
            return <PartThumb part={getPart('dc-input')} />;
        case 'protection':
            return <PartThumb part={getPart('fuse')} />;
        case 'dcdc':
            return <PartThumb part={getPart('buck')} />;
        case 'mcu':
            return <PartThumb part={getPart('mcu')} />;
        case 'ethernet':
            return <PartThumb part={getPart('rj45')} />;
        case 'field-connector':
            return <PartThumb part={getPart('field-connector')} />;
        case 'rs485':
            return <BusArrowsThumb labels={['A', 'B']} bidirectional={false} />;
        case 'can':
            return <BusArrowsThumb labels={['H', 'L']} bidirectional />;
        case 'sensor-board':
            return <ThermometerThumb />;
    }
}

interface PaletteRowProps {
  readonly title: string;
  readonly subtitle: string;
  readonly thumb: ReactNode;
  readonly mint: () => Cell;
  /** Places the item; returns its id + name, or undefined when nothing was added. */
  readonly place: (point: {
    x: number;
    y: number;
  }) => { readonly id: string; readonly name: string } | undefined;
}

function PaletteRow({ title, subtitle, thumb, mint, place }: PaletteRowProps) {
    const { startCellDrag } = useStencil();
    const { paperScroller } = usePaperScroller();
    const { selectCells } = useSelectionCollection();
    const announce = useAnnouncer();

    const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        // No preventDefault: the underlying ui.Stencil drives its drag on the
        // browser's compatibility mouse events; canceling the pointerdown would
        // suppress them and freeze the drag. `select-none` on the rail handles
        // text selection instead.
        startCellDrag(mint(), event);
    };

    const placeAtCenter = () => {
        const area = paperScroller?.getVisibleArea();
        const center = area ? area.center() : { x: 300, y: 300 };
        const snap = (value: number) => Math.round(value / 4) * 4;
        const placed = place({ x: snap(center.x), y: snap(center.y) });
        // The store bails without committing when there is nowhere to put the
        // part — say THAT, never a success that did not happen. On success,
        // SELECT the new item: the frame + inspector card are the visible
        // confirmation a keyboard add otherwise lacks.
        if (placed === undefined) {
            announce('Could not place the part — add a subsystem block first');
            return;
        }
        selectCells([placed.id]);
        announce(`${placed.name} added and selected`);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        placeAtCenter();
    };

    return (
        <button
            type="button"
            aria-label={`Add ${title}`}
            onPointerDown={onPointerDown}
            onKeyDown={onKeyDown}
            // `relative` is for contrast checkers, not layout: a clip-path element
            // that is not positioned makes axe sort the tile under its section and
            // give up on every label's background ("needs review").
            className="chamfer group relative flex w-full cursor-grab items-center gap-2.5 px-2 py-1.5 text-left transition-colors [--chamfer:6px] hover:bg-accent active:cursor-grabbing"
        >
            <span className="grid size-10 flex-none place-items-center text-symbol-ink">{thumb}</span>
            <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{title}</span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">{subtitle}</span>
            </span>
        </button>
    );
}

const PART_ORDER: readonly PartCategory[] = [
    'power',
    'controllers',
    'interfaces',
    'sensors',
    'connectors',
    'passives',
];

function matches(query: string, ...haystack: readonly string[]): boolean {
    const needle = query.trim().toLowerCase();
    if (needle === '') return true;
    return haystack.some((text) => text.toLowerCase().includes(needle));
}

function ConnectivityRows({ query }: { readonly query: string }) {
    const addPartAt = useDesignerStore((state) => state.addPartAt);
    const groups = useMemo(() => {
        const parts = Object.values<PartDef>(PART_CATALOG).filter((part) =>
            matches(query, part.name, part.description, part.footprint),
        );
        return PART_ORDER.map((category) => ({
            category,
            parts: parts.filter((part) => part.category === category),
        })).filter((group) => group.parts.length > 0);
    }, [query]);

    if (groups.length === 0) return <PaletteEmpty query={query} />;
    return (
        <>
            {groups.map((group) => (
                <section key={group.category} aria-label={CATEGORY_LABEL[group.category]}>
                    <h3 className="text-tag px-2 pb-1 pt-3 text-muted-foreground/80">{CATEGORY_LABEL[group.category]}</h3>
                    {group.parts.map((part) => (
                        <PaletteRow
                            key={part.id}
                            title={part.name}
                            subtitle={part.footprint}
                            thumb={<PartThumb part={part} />}
                            mint={() => mintPartDrop(part)}
                            place={(point) => addPartAt(part.id, point)}
                        />
                    ))}
                </section>
            ))}
        </>
    );
}

function ArchitectureRows({ query }: { readonly query: string }) {
    const addSubsystemAt = useDesignerStore((state) => state.addSubsystemAt);
    const templates = SUBSYSTEM_TEMPLATES.filter((template) =>
        matches(query, template.name, template.description, ...template.ifaces.map((iface) => IFACE_LABEL[iface])),
    );
    if (templates.length === 0) return <PaletteEmpty query={query} />;
    return (
        <section aria-label="Subsystems">
            <h3 className="text-tag px-2 pb-1 pt-3 text-muted-foreground/80">Subsystems</h3>
            {templates.map((template) => (
                <PaletteRow
                    key={template.id}
                    title={template.name}
                    subtitle={template.description}
                    thumb={<TemplateThumb template={template} />}
                    mint={() => mintTemplateDrop(template)}
                    place={(point) => addSubsystemAt(template.id, point)}
                />
            ))}
        </section>
    );
}

/** One board row: the name is edited in place, empty boards can be removed. */
function BoardRow({ boardId }: { readonly boardId: string }) {
    const name = useDesignerStore((state) => boardName(state.design, boardId));
    const removable = useDesignerStore(
        (state) =>
            state.design.boards.length > 1 &&
      !state.design.components.some((component) => component.board === boardId),
    );
    const renameBoard = useDesignerStore((state) => state.renameBoard);
    const removeBoard = useDesignerStore((state) => state.removeBoard);
    const announce = useAnnouncer();
    return (
        <div className="group flex items-center gap-1 px-2 py-0.5">
            <input
                value={name}
                onChange={(event) => renameBoard(boardId, event.target.value)}
                aria-label={`Board name: ${name}`}
                className="h-7 w-full min-w-0 border border-transparent bg-transparent px-1 text-sm text-foreground outline-none transition-colors hover:border-input focus:border-input focus:bg-secondary"
            />
            {removable ? (
                <button
                    type="button"
                    aria-label={`Remove empty board ${name}`}
                    onClick={() => {
                        removeBoard(boardId);
                        announce(`Board ${name} removed`);
                    }}
                    className="grid size-6 flex-none place-items-center text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                    <X className="size-3.5" aria-hidden />
                </button>
            ) : null}
        </div>
    );
}

/** Boards are documents the user authors too: list, rename, add, remove. */
function BoardsSection() {
    const boardIds = useDesignerStore(useShallow((state) => state.design.boards.map((board) => board.id)));
    const addBoard = useDesignerStore((state) => state.addBoard);
    const announce = useAnnouncer();
    return (
    // data-focus-anchor: removing a board takes its focused button with it —
    // focus lands back on this section (see useFocusRescue).
        <section aria-label="Boards" tabIndex={-1} data-focus-anchor="" className="border-t border-border pt-1">
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
                <h3 className="text-tag text-muted-foreground/80">Boards</h3>
                <button
                    type="button"
                    onClick={() => {
                        addBoard('');
                        announce('New board added — drop parts onto its outline');
                    }}
                    className="flex h-6 items-center gap-1 px-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <Plus className="size-3" aria-hidden />
          New board
                </button>
            </div>
            {boardIds.map((boardId) => (
                <BoardRow key={boardId} boardId={boardId} />
            ))}
            <p className="px-3 pb-1 pt-1 text-[11px] leading-snug text-muted-foreground">
        New boards appear as an empty outline on the sheet — drop parts onto it, or reassign parts from the
        inspector.
            </p>
        </section>
    );
}

/** An empty state that keeps teaching: what the search looked through. */
function PaletteEmpty({ query }: { readonly query: string }) {
    return (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
      Nothing matches “{query}”. Search covers names, footprints, and interfaces.
        </p>
    );
}

export function DesignerPalette({ view }: { readonly view: ViewId }) {
    const [query, setQuery] = useState('');
    // Typing stays instant even while a long list re-filters.
    const deferredQuery = useDeferredValue(query);

    return (
    // The <Stencil> host must live inside <Diagram> (it resolves the target
    // paper from context). Hidden on phones — dragging needs the room.
        <Stencil
            className="absolute bottom-3 left-3 top-3 z-10 hidden w-56 md:block"
            onCellDragStart={revealDragGhost}
            onCellDrag={revealDragGhost}
        >
            <div className="chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] flex h-full select-none flex-col bg-card shadow-(--panel-shadow)">
                <header className="px-3 pb-2 pt-3">
                    <h2 className="text-tag text-muted-foreground">
                        {view === 'architecture' ? 'Subsystem library' : 'Component library'}
                    </h2>
                    <label className="mt-2 flex h-8 items-center gap-1.5 border border-input bg-secondary px-2 focus-within:shadow-[inset_0_0_0_2px_var(--ring)]">
                        <Search className="size-3.5 flex-none text-muted-foreground" aria-hidden />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={view === 'architecture' ? 'Search subsystems' : 'Search components'}
                            aria-label={view === 'architecture' ? 'Search subsystems' : 'Search components'}
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                        />
                    </label>
                    <p className="mt-1.5 text-xs text-muted-foreground">Drag onto the sheet, or press Enter</p>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
                    {view === 'architecture' ? (
                        <ArchitectureRows query={deferredQuery} />
                    ) : (
                        <ConnectivityRows query={deferredQuery} />
                    )}
                </div>
                {view === 'connectivity' ? <BoardsSection /> : null}
            </div>
        </Stencil>
    );
}
