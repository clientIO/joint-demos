// The zustand store — the single source of truth for the whole designer.
//
// The store owns ONE thing: the `Design` document. Everything else in state
// is DERIVED from it on every change (sub-millisecond at this scale):
//
//   design ──► nets ──► operating ──► findings ──► flags (badges per cell)
//          ──► bundles ──► archCells   (architecture view, controlled)
//          ──► schCells                (connectivity view, controlled)
//
// Both canvases run in CONTROLLED mode: `<Diagram cells={…}>` renders the
// derived cells, and every canvas edit flows back through `onCellsChange`
// into a write-back that patches the Design — so the two views, the outputs,
// and the validation can never disagree.
//
// History is DOMAIN-level: undo/redo snapshots the Design itself, which is
// why fixing a finding, rewiring a pin, or dropping a subsystem all undo
// cleanly with one stack. Canvas drags coalesce into a single history entry.

import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { getPart, type InterfaceKind, type PartKindId } from '@/model/catalog';
import { newId, nextRef, pinKey, type Design, type Point, type Wire } from '@/model/design';
import { INITIAL_DESIGN } from '@/model/initial-design';
import { getSubsystemTemplate, type SubsystemTemplateId } from '@/views/subsystem-templates';
import { deriveNets, type NetIndex } from '@/model/nets';
import { solveOperating, type OperatingPoint } from '@/model/operating';
import { validateDesign, type BusCheck, type Finding, type FindingSeverity } from '@/model/validation';
import { applyArchCellsChange, deriveArchCells, deriveBundles, type BundleIndex } from '@/views/arch-cells';
import { applySchCellsChange, boardAt, boardBounds, deriveSchCells, nearestSubsystem } from '@/views/sch-cells';
import { readEndId, type Cell } from '@/views/cell-data';

export type ViewId = 'architecture' | 'connectivity' | 'outputs';

/** Transient feedback for a just-drawn connection (one at a time, latest wins). */
export interface ConnectionToast {
  readonly id: number;
  readonly kind: 'success' | 'warning' | 'error';
  readonly title: string;
  readonly detail?: string;
  /** Colors the toast tick with the connection's interface hue. */
  readonly iface?: InterfaceKind;
}

let toastCounter = 0;

/** Everything traceable for one net, resolved to cell ids in BOTH views. */
export interface TraceSets {
  readonly netId: string;
  readonly netName: string;
  readonly wires: ReadonlySet<string>;
  readonly components: ReadonlySet<string>;
  readonly bundles: ReadonlySet<string>;
  readonly subsystems: ReadonlySet<string>;
}

interface Derived {
  readonly nets: NetIndex;
  readonly operating: OperatingPoint;
  readonly findings: readonly Finding[];
  readonly bundles: BundleIndex;
  readonly archCells: readonly Cell[];
  readonly schCells: readonly Cell[];
  /** Worst finding severity per cell id (component, wire, bundle, subsystem). */
  readonly flags: ReadonlyMap<string, FindingSeverity>;
  /** Pins with 2+ wires per component — drawn with a junction dot. */
  readonly junctions: ReadonlyMap<string, ReadonlySet<string>>;
}

interface DesignerState extends Derived {
  readonly design: Design;

  readonly view: ViewId;
  readonly liveMode: boolean;
  readonly trace: TraceSets | null;
  /** Architecture bundles the user expanded into their member signals. */
  readonly expandedBundles: ReadonlySet<string>;
  /** One-shot drill-down target: the connectivity view zooms here on mount. */
  readonly focusSubsystemId: string | null;
  /**
   * The subsystem whose DETAIL the connectivity view is showing — unlike the
   * one-shot zoom target above, this persists so the breadcrumb can say whose
   * wiring you drilled into ("System / MCU Controller"). Null = whole system.
   */
  readonly detailSubsystemId: string | null;

  /** Feedback for the latest drawn connection; null once dismissed/expired. */
  readonly toast: ConnectionToast | null;
  readonly dismissToast: () => void;

  readonly past: readonly Design[];
  readonly future: readonly Design[];

  readonly setView: (view: ViewId) => void;
  readonly toggleLiveMode: () => void;
  /** Click-to-trace: highlight one whole net across both views (null clears). */
  readonly setTracedNet: (netId: string | null) => void;
  /** Bus expansion/collapse: fan a bundle into its member signals and back. */
  readonly toggleBundle: (bundleId: string) => void;
  /** Drill down: open the connectivity view zoomed to one subsystem. */
  readonly openSubsystemDetail: (subsystemId: string) => void;
  readonly clearFocusSubsystem: () => void;
  /** Back out of a drill-down: the breadcrumb's "System" action. */
  readonly clearSubsystemDetail: () => void;
  /** Removes a component (with its wires) or a whole subsystem. */
  readonly removeComponent: (componentId: string) => void;
  readonly removeSubsystem: (subsystemId: string) => void;

  /** Board management — boards are data: create, rename, reassign, remove. */
  readonly addBoard: (name: string) => void;
  readonly renameBoard: (boardId: string, name: string) => void;
  /** Removes an EMPTY board (components keep their board otherwise). */
  readonly removeBoard: (boardId: string) => void;
  /** Sets a board's stored outline rect size (keyboard path to resize). */
  readonly setBoardSize: (boardId: string, size: { width: number; height: number }) => void;
  readonly setComponentBoard: (componentId: string, boardId: string) => void;
  readonly setSubsystemBoard: (subsystemId: string, boardId: string) => void;

  /** The `<Diagram onCellsChange>` handlers, one per canvas view. */
  readonly onArchCellsChange: (cells: readonly Cell[]) => void;
  readonly onSchCellsChange: (cells: readonly Cell[]) => void;

  /** Applies a finding's "resolve design" fix; returns it for announcing. */
  readonly applyFix: (findingId: string) => Finding | undefined;
  /** Keyboard-path placement (palette Enter/Space): straight into the Design.
   * Both search for CLEAR space near the requested point (dropping a part on
   * top of existing wiring is never what Enter meant) and return the new
   * item's id + display name so the caller can select and announce it. */
  readonly addPartAt: (
    part: PartKindId,
    point: Point,
  ) => { readonly id: string; readonly name: string } | undefined;
  readonly addSubsystemAt: (
    template: SubsystemTemplateId,
    point: Point,
  ) => { readonly id: string; readonly name: string };
  /** Inspector edits — every one is a plain Design patch. */
  readonly renameSubsystem: (id: string, name: string) => void;
  readonly setNotes: (target: { subsystem?: string; component?: string }, notes: string) => void;
  /** Renames a whole net: the label lands on its first wire, the rest clear. */
  readonly renameNet: (netId: string, name: string) => void;

  readonly undo: () => void;
  readonly redo: () => void;
  readonly reset: () => void;
  /** Empties the design (one blank board survives) — undoable like any edit. */
  readonly clearDesign: () => void;
}

function severityRank(severity: FindingSeverity): number {
    return severity === 'error' ? 2 : 1;
}

/**
 * The bus-width rule's input, derived from the bundles: for every connected
 * port pair, the signal roles both sides declare that no wire carries.
 */
function deriveBusChecks(design: Design, bundles: BundleIndex): readonly BusCheck[] {
    const wired = new Set<string>();
    for (const wire of design.wires) {
        const a = pinKey(wire.from);
        const b = pinKey(wire.to);
        wired.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
    const checks: BusCheck[] = [];
    for (const bundle of bundles.bundles) {
        const missing: { role: string; a: { component: string; pin: string }; b: { component: string; pin: string } }[] = [];
        for (const pinA of bundle.a.port.pins) {
            const pinB = bundle.b.port.pins.find((candidate) => candidate.role === pinA.role);
            if (pinB === undefined) continue; // a role only one side declares is spare, not missing
            const keyA = pinKey(pinA);
            const keyB = pinKey(pinB);
            if (!wired.has(keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`)) {
                missing.push({ role: pinA.role, a: { component: pinA.component, pin: pinA.pin }, b: { component: pinB.component, pin: pinB.pin }});
            }
        }
        if (missing.length === 0) continue;
        const aName = design.subsystems.find((subsystem) => subsystem.id === bundle.a.subsystemId)?.name ?? bundle.a.subsystemId;
        const bName = design.subsystems.find((subsystem) => subsystem.id === bundle.b.subsystemId)?.name ?? bundle.b.subsystemId;
        checks.push({ bundleId: bundle.id, label: bundle.label, aName, bName, missing, wireIds: bundle.wireIds });
    }
    return checks;
}

/** Recomputes every derived slice for a design (sub-millisecond at this
 * scale, so eager-on-every-commit keeps every projection trivially fresh). */
function derive(design: Design, expandedBundles: ReadonlySet<string>): Derived {
    const nets = deriveNets(design);
    const operating = solveOperating(design, nets);
    const bundles = deriveBundles(design);
    const findings = validateDesign(design, nets, operating, deriveBusChecks(design, bundles));
    const archCells = deriveArchCells(design, bundles, expandedBundles);
    const schCells = deriveSchCells(design);

    // Badge map: findings name components/wires; bundles and subsystems flag
    // when any of their members do — that is how one problem shows in BOTH views.
    const flags = new Map<string, FindingSeverity>();
    const flag = (id: string, severity: FindingSeverity): void => {
        const existing = flags.get(id);
        if (existing === undefined || severityRank(severity) > severityRank(existing)) flags.set(id, severity);
    };
    const subsystemOf = new Map(design.components.map((component) => [component.id, component.subsystemId]));
    for (const finding of findings) {
        for (const componentId of finding.components) {
            flag(componentId, finding.severity);
            const subsystemId = subsystemOf.get(componentId);
            if (subsystemId !== undefined) flag(subsystemId, finding.severity);
        }
        for (const wireId of finding.wires) flag(wireId, finding.severity);
        for (const bundleId of finding.bundles ?? []) flag(bundleId, finding.severity);
    }
    for (const bundle of bundles.bundles) {
        for (const wireId of bundle.wireIds) {
            const severity = flags.get(wireId);
            if (severity !== undefined) flag(bundle.id, severity);
        }
    }

    // Junction dots: any pin where two or more wires meet (with the pin itself
    // that is a 3-way T — the drawing convention for a joined crossing).
    const wireCounts = new Map<string, number>();
    for (const wire of design.wires) {
        for (const end of [wire.from, wire.to]) {
            const key = `${end.component}:${end.pin}`;
            wireCounts.set(key, (wireCounts.get(key) ?? 0) + 1);
        }
    }
    const junctions = new Map<string, Set<string>>();
    for (const [key, count] of wireCounts) {
        if (count < 2) continue;
        const [componentId, pinId] = key.split(':');
        if (componentId === undefined || pinId === undefined) continue;
        const set = junctions.get(componentId) ?? new Set<string>();
        set.add(pinId);
        junctions.set(componentId, set);
    }

    return { nets, operating, findings, bundles, archCells, schCells, flags, junctions };
}

/** Resolves a net into highlightable cell ids for both views. */
function traceSetsFor(netId: string, derived: Derived, design: Design): TraceSets | null {
    const net = derived.nets.nets.find((candidate) => candidate.id === netId);
    if (net === undefined) return null;
    const wires = new Set(net.wires.map((wire) => wire.id));
    const components = new Set(net.pins.map((pin) => pin.component));
    const subsystemOf = new Map(design.components.map((component) => [component.id, component.subsystemId]));
    const subsystems = new Set<string>();
    for (const componentId of components) {
        const subsystemId = subsystemOf.get(componentId);
        if (subsystemId !== undefined) subsystems.add(subsystemId);
    }
    const bundles = new Set<string>();
    for (const bundle of derived.bundles.bundles) {
        if (bundle.wireIds.some((wireId) => wires.has(wireId))) bundles.add(bundle.id);
    }
    return { netId, netName: net.name, wires, components, bundles, subsystems };
}

/**
 * True when the paper reports a fully CONNECTED link that no derived cell
 * explains — the leftover of an accepted drop the write-back could not turn
 * into domain wires. Mid-drag drafts never trip this: their dragged end is a
 * point, not an element id, so `readEndId` returns undefined for it.
 */
function hasForeignConnectedLink(cells: readonly Cell[], derived: readonly Cell[]): boolean {
    const known = new Set(derived.map((cell) => String(cell.id)));
    return cells.some(
        (cell) =>
            cell.type === 'link' &&
      !known.has(String(cell.id)) &&
      readEndId(cell.source) !== undefined &&
      readEndId(cell.target) !== undefined,
    );
}

// Drag coalescing: geometry-only edits within this window merge into the
// history entry their gesture opened (so one drag = one undo step).
const COALESCE_WINDOW_MS = 900;
const HISTORY_CAP = 100;
let lastCoalesceKey: string | null = null;
let lastCoalesceAt = 0;

/** Ends the current coalescing window — called on pointer-up so two drags in
 * quick succession stay two separate undo entries. */
export function endCoalescing(): void {
    lastCoalesceKey = null;
}

// Local design history: the document survives a reload. Guarded so the store
// also runs where localStorage doesn't exist (unit tests in node). Version
// bump when the Design shape changes (v2 added dynamic boards; v3 the
// review-corrected seed — refdes classes, DE wire, open-drain narrative).
const STORAGE_KEY = 'esd-design/3';

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * First point at (or ringing outward from) `start` where a width×height box
 * clears every occupied rect by a 24 px margin. Bounded search — after 12
 * rings the sheet is genuinely packed and the start point is returned as-is.
 */
function findClearPoint(occupied: readonly Rect[], width: number, height: number, start: Point): Point {
    const collides = (x: number, y: number): boolean =>
        occupied.some(
            (rect) =>
                x < rect.x + rect.width + 24 &&
        x + width + 24 > rect.x &&
        y < rect.y + rect.height + 24 &&
        y + height + 24 > rect.y,
        );
    if (!collides(start.x, start.y)) return start;
    for (let ring = 1; ring <= 12; ring += 1) {
        const step = ring * 48;
        for (const [dx, dy] of [
            [step, 0],
            [0, step],
            [-step, 0],
            [0, -step],
            [step, step],
            [-step, step],
            [step, -step],
            [-step, -step],
        ] as const) {
            if (!collides(start.x + dx, start.y + dy)) return { x: start.x + dx, y: start.y + dy };
        }
    }
    return start;
}

/** Shallow shape check on our own persisted JSON (same-origin round-trip). */
function isPersistedDesign(value: unknown): value is Design {
    if (typeof value !== 'object' || value === null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        Array.isArray(record.boards) &&
    Array.isArray(record.subsystems) &&
    Array.isArray(record.components) &&
    Array.isArray(record.wires) &&
    typeof record.archVertices === 'object' &&
    record.archVertices !== null
    );
}

function loadPersistedDesign(): Design | null {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!isPersistedDesign(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

// Debounced: `commit` runs per FRAME during a drag, and a synchronous
// localStorage write at pointer-move frequency would jank the drag. A whole
// gesture collapses into one write.
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let pendingPersist: Design | null = null;

function writePersisted(design: Design): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
    } catch {
    // Quota/privacy-mode failures just mean no persistence this session.
    }
}

function persistDesign(design: Design): void {
    pendingPersist = design;
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
        pendingPersist = null;
        writePersisted(design);
    }, 500);
}

// Edits made inside the debounce window must survive a reload: flush the
// pending write synchronously when the page goes away.
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        if (pendingPersist === null) return;
        writePersisted(pendingPersist);
        pendingPersist = null;
    });
}

export const useDesignerStore = create<DesignerState>()((set, get) => {
    /** The one mutation path: derive, manage history, keep the trace fresh. */
    const commit = (design: Design, coalesceKey?: string): void => {
        const state = get();
        if (design === state.design) return;
        const now = Date.now();
        const coalesced =
      coalesceKey !== undefined && coalesceKey === lastCoalesceKey && now - lastCoalesceAt < COALESCE_WINDOW_MS;
        lastCoalesceKey = coalesceKey ?? null;
        lastCoalesceAt = now;

        const derived = derive(design, state.expandedBundles);
        const trace = state.trace === null ? null : traceSetsFor(state.trace.netId, derived, design);
        set({
            design,
            ...derived,
            trace,
            past: coalesced ? state.past : [...state.past.slice(-(HISTORY_CAP - 1)), state.design],
            future: [],
        });
        persistDesign(design);
    };

    /**
   * Feedback for a just-DRAWN connection (structure untouched except wires):
   * names the nets it landed on, carries the interface hue, and turns amber
   * when the commit's own validation immediately flagged one of the new
   * wires — the "5 V feed reached a 3.3 V pin" moment, surfaced at the
   * gesture instead of waiting to be noticed in the problems panel.
   */
    const toastDrawnWires = (addedWires: readonly Wire[], findingsBefore: number): void => {
        const fresh = get();
        const nets = [
            ...new Set(
                addedWires
                    .map((wire) => fresh.nets.byWire.get(wire.id)?.name)
                    .filter((name) => name !== undefined),
            ),
        ];
        const iface = fresh.nets.byWire.get(addedWires[0]?.id ?? '')?.iface;
        const flagged =
      fresh.findings.length > findingsBefore
          ? fresh.findings.find((finding) => addedWires.some((wire) => finding.wires.includes(wire.id)))
          : undefined;
        toastCounter += 1;
        set({
            toast: {
                id: toastCounter,
                kind: flagged === undefined ? 'success' : 'warning',
                title:
          flagged !== undefined
              ? 'Connected — suggestion raised'
              : addedWires.length > 1
                  ? `Connected ×${addedWires.length}`
                  : 'Connected',
                detail: flagged?.title ?? (nets.length > 0 ? nets.slice(0, 3).join(' · ') : undefined),
                iface,
            },
        });
    };

    /** Feedback for a drawn connection the write-back DECLINED. */
    const toastDeclined = (detail: string): void => {
        toastCounter += 1;
        set({ toast: { id: toastCounter, kind: 'error', title: 'Not connected', detail }});
    };

    /** Undo/redo restore a snapshot without touching the history semantics. */
    const restore = (design: Design, past: readonly Design[], future: readonly Design[]): void => {
        const state = get();
        lastCoalesceKey = null;
        const derived = derive(design, state.expandedBundles);
        const trace = state.trace === null ? null : traceSetsFor(state.trace.netId, derived, design);
        set({ design, ...derived, trace, past, future });
        persistDesign(design);
    };

    const NO_EXPANDED: ReadonlySet<string> = new Set();
    // A persisted document can pass the shallow shape check yet still reference
    // parts or pins that no longer exist in the catalog — deriving it would
    // throw during module evaluation and white-screen the app with no way out.
    // Fall back to the seed instead of trusting old storage that far.
    let initialDesign = loadPersistedDesign() ?? INITIAL_DESIGN;
    let initial: Derived;
    try {
        initial = derive(initialDesign, NO_EXPANDED);
    } catch {
        initialDesign = INITIAL_DESIGN;
        initial = derive(initialDesign, NO_EXPANDED);
    }

    return {
        design: initialDesign,
        ...initial,
        view: 'architecture',
        liveMode: false,
        trace: null,
        toast: null,
        dismissToast: () => set({ toast: null }),
        expandedBundles: NO_EXPANDED,
        focusSubsystemId: null,
        detailSubsystemId: null,
        past: [],
        future: [],

        // Opening the connectivity sheet re-derives its cells: the stored ones
        // date from the last Design commit, before the router remembered the
        // routes it has drawn since — mounting those showed every wire on stale
        // ends for a frame, then jumping.
        setView: (view) =>
            set(view === 'connectivity' ? { view, schCells: deriveSchCells(get().design) } : { view }),
        toggleLiveMode: () => set((state) => ({ liveMode: !state.liveMode })),

        setTracedNet: (netId) => {
            const state = get();
            set({ trace: netId === null ? null : traceSetsFor(netId, state, state.design) });
        },

        toggleBundle: (bundleId) => {
            const state = get();
            const expandedBundles = new Set(state.expandedBundles);
            if (expandedBundles.has(bundleId)) expandedBundles.delete(bundleId);
            else expandedBundles.add(bundleId);
            // Same design, different projection — re-derive the architecture cells.
            set({ expandedBundles, ...derive(state.design, expandedBundles) });
        },

        openSubsystemDetail: (subsystemId) => {
            get().setView('connectivity');
            set({ focusSubsystemId: subsystemId, detailSubsystemId: subsystemId });
        },
        clearFocusSubsystem: () => set({ focusSubsystemId: null }),
        clearSubsystemDetail: () => set({ detailSubsystemId: null }),

        removeComponent: (componentId) => {
            const { design } = get();
            commit({
                ...design,
                components: design.components.filter((component) => component.id !== componentId),
                wires: design.wires.filter(
                    (wire) => wire.from.component !== componentId && wire.to.component !== componentId,
                ),
            });
        },

        removeSubsystem: (subsystemId) => {
            const { design } = get();
            const memberIds = new Set(
                design.components.filter((component) => component.subsystemId === subsystemId).map((component) => component.id),
            );
            commit({
                ...design,
                subsystems: design.subsystems.filter((subsystem) => subsystem.id !== subsystemId),
                components: design.components.filter((component) => !memberIds.has(component.id)),
                wires: design.wires.filter(
                    (wire) => !memberIds.has(wire.from.component) && !memberIds.has(wire.to.component),
                ),
            });
            // A breadcrumb must never point at a subsystem that no longer exists.
            if (get().detailSubsystemId === subsystemId) set({ detailSubsystemId: null });
        },

        addBoard: (name) => {
            const { design } = get();
            // Stack the new empty outline to the right of everything on the sheet.
            let rightEdge = 40;
            for (const board of design.boards) {
                const bounds = boardBounds(design, board.id);
                if (bounds !== undefined) rightEdge = Math.max(rightEdge, bounds.x + bounds.width);
            }
            const trimmed = name.trim() === '' ? `Board ${design.boards.length + 1}` : name.trim();
            commit({
                ...design,
                boards: [...design.boards, { id: newId('board'), name: trimmed, origin: { x: rightEdge + 80, y: 80 }}],
            });
        },

        renameBoard: (boardId, name) => {
            // Raw value, same as renameSubsystem — trimming per keystroke would
            // stop a controlled input from ever accepting a space.
            const { design } = get();
            commit(
                {
                    ...design,
                    boards: design.boards.map((board) => (board.id === boardId ? { ...board, name } : board)),
                },
                `rename-board-${boardId}`,
            );
        },

        removeBoard: (boardId) => {
            const { design } = get();
            const inUse = design.components.some((component) => component.board === boardId);
            if (inUse || design.boards.length <= 1) return;
            commit({
                ...design,
                boards: design.boards.filter((board) => board.id !== boardId),
                // Subsystems pointing at the removed board fall back to the first one.
                subsystems: design.subsystems.map((subsystem) =>
                    subsystem.board === boardId ? { ...subsystem, board: design.boards[0]?.id ?? boardId } : subsystem,
                ),
            });
        },

        setBoardSize: (boardId, size) => {
            const { design } = get();
            const board = design.boards.find((candidate) => candidate.id === boardId);
            if (board === undefined || size.width < 80 || size.height < 80) return;
            // A board without a stored rect draws at its derived bounds — anchor the
            // new rect there so the outline resizes in place instead of jumping.
            const origin =
        board.size === undefined ? boardBounds(design, boardId) ?? board.origin : board.origin;
            commit(
                {
                    ...design,
                    boards: design.boards.map((candidate) =>
                        candidate.id === boardId
                            ? { ...candidate, origin: { x: origin.x, y: origin.y }, size: { ...size }}
                            : candidate,
                    ),
                },
                `board-size-${boardId}`,
            );
        },

        setComponentBoard: (componentId, boardId) => {
            const { design } = get();
            commit({
                ...design,
                components: design.components.map((component) =>
                    component.id === componentId ? { ...component, board: boardId } : component,
                ),
            });
        },

        setSubsystemBoard: (subsystemId, boardId) => {
            const { design } = get();
            // Moving a BLOCK moves its parts with it — that is what the block means.
            commit({
                ...design,
                subsystems: design.subsystems.map((subsystem) =>
                    subsystem.id === subsystemId ? { ...subsystem, board: boardId } : subsystem,
                ),
                components: design.components.map((component) =>
                    component.subsystemId === subsystemId ? { ...component, board: boardId } : component,
                ),
            });
        },

        // The write-backs decide what changed; geometry-only edits coalesce so a
        // drag lands as ONE history entry (`onCellsChange` fires per frame).
        onArchCellsChange: (cells) => {
            const state = get();
            const next = applyArchCellsChange(state.design, state.bundles, state.expandedBundles, cells);
            if (next === state.design) {
                // An accepted drop the write-back could NOT mint (e.g. two ports with
                // no shared signal roles) leaves its link in the graph — and with no
                // commit there is no re-sync to purge it. Re-issue the derived cells
                // so the controlled sync prunes the leftover.
                if (hasForeignConnectedLink(cells, state.archCells)) {
                    set({ archCells: deriveArchCells(state.design, state.bundles, state.expandedBundles) });
                    toastDeclined('These ports share no matching signals');
                }
                return;
            }
            const structureUnchanged =
        next.subsystems.length === state.design.subsystems.length &&
        next.components.length === state.design.components.length;
            const geometryOnly = structureUnchanged && next.wires.length === state.design.wires.length;
            const knownWires = new Set(state.design.wires.map((wire) => wire.id));
            const addedWires = next.wires.filter((wire) => !knownWires.has(wire.id));
            const findingsBefore = state.findings.length;
            commit(next, geometryOnly ? 'arch-geometry' : undefined);
            // Only a DRAWN connection (wires grew, structure untouched) toasts —
            // template drops add subsystems/components and announce elsewhere.
            if (structureUnchanged && addedWires.length > 0) toastDrawnWires(addedWires, findingsBefore);
        },
        onSchCellsChange: (cells) => {
            const state = get();
            const next = applySchCellsChange(state.design, cells);
            if (next === state.design) {
                // Same no-commit-no-resync trap as the foreign-link case: a derived
                // cell deleted in the graph without a domain effect (e.g. the remove
                // handle on a board outline that still has parts) would stay gone —
                // and a foreign ELEMENT the write-back declined to mint (a part drop
                // with no subsystem to assign it to) would stay as a ghost.
                const present = new Set(cells.map((cell) => String(cell.id)));
                const derivedIds = new Set(state.schCells.map((cell) => String(cell.id)));
                const declinedLink = hasForeignConnectedLink(cells, state.schCells);
                if (
                    declinedLink ||
          state.schCells.some((cell) => !present.has(String(cell.id))) ||
          cells.some((cell) => cell.type !== 'link' && !derivedIds.has(String(cell.id)))
                ) {
                    set({ schCells: deriveSchCells(state.design) });
                    if (declinedLink) toastDeclined('Wires connect pin to pin — try a pin stub');
                }
                return;
            }
            const structureUnchanged = next.components.length === state.design.components.length;
            const geometryOnly = structureUnchanged && next.wires.length === state.design.wires.length;
            const knownWires = new Set(state.design.wires.map((wire) => wire.id));
            const addedWires = next.wires.filter((wire) => !knownWires.has(wire.id));
            const findingsBefore = state.findings.length;
            commit(next, geometryOnly ? 'sch-geometry' : undefined);
            // Only a drawn pin-to-pin wire toasts — part drops announce elsewhere.
            if (structureUnchanged && addedWires.length > 0) toastDrawnWires(addedWires, findingsBefore);
        },

        applyFix: (findingId) => {
            const state = get();
            const finding = state.findings.find((candidate) => candidate.id === findingId);
            if (finding?.fix === undefined) return undefined;
            commit(finding.fix.apply(state.design));
            // Locate → Fix is the natural flow, and the fix's canvas change often
            // lands OUTSIDE the traced net — lift the dim so it is actually seen.
            set({ trace: null });
            return finding;
        },

        addPartAt: (part, point) => {
            const { design } = get();
            const size = getPart(part).size;
            // Clear space first — Enter means "add it where I can see it", never
            // "bury it under the existing wiring".
            const spot = findClearPoint(
                design.components.map((component) => ({
                    ...component.position,
                    ...getPart(component.part).size,
                })),
                size.width,
                size.height,
                point,
            );
            // Same assignment rules as a pointer drop: the containing board's
            // outline, then the nearest subsystem on it. No subsystem → no commit,
            // and the caller gets `undefined` so it never announces a success that
            // did not happen.
            const ref = nextRef(design, part);
            const board = boardAt(design, spot);
            const subsystemId = nearestSubsystem(design, board, spot);
            if (subsystemId === undefined) return undefined;
            commit({
                ...design,
                components: [
                    ...design.components,
                    { id: ref, ref, part, board, subsystemId, position: { x: spot.x, y: spot.y }},
                ],
            });
            return { id: ref, name: ref };
        },

        addSubsystemAt: (template, point) => {
            const { design } = get();
            const spot = findClearPoint(
                design.subsystems.map((subsystem) => ({ ...subsystem.position, ...subsystem.size })),
                196,
                156,
                point,
            );
            const built = getSubsystemTemplate(template).build(design, spot);
            commit({
                ...design,
                subsystems: [...design.subsystems, built.subsystem],
                components: [...design.components, ...built.components],
                wires: [...design.wires, ...built.wires],
            });
            return { id: built.subsystem.id, name: built.subsystem.name };
        },

        renameSubsystem: (id, name) => {
            const { design } = get();
            commit(
                {
                    ...design,
                    subsystems: design.subsystems.map((subsystem) =>
                        subsystem.id === id ? { ...subsystem, name } : subsystem,
                    ),
                },
                `rename-${id}`,
            );
        },

        setNotes: (target, notes) => {
            const { design } = get();
            if (target.subsystem !== undefined) {
                commit(
                    {
                        ...design,
                        subsystems: design.subsystems.map((subsystem) =>
                            subsystem.id === target.subsystem ? { ...subsystem, notes } : subsystem,
                        ),
                    },
                    `notes-${target.subsystem}`,
                );
            } else if (target.component !== undefined) {
                commit(
                    {
                        ...design,
                        components: design.components.map((component) =>
                            component.id === target.component ? { ...component, notes } : component,
                        ),
                    },
                    `notes-${target.component}`,
                );
            }
        },

        renameNet: (netId, name) => {
            const state = get();
            const net = state.nets.nets.find((candidate) => candidate.id === netId);
            if (net === undefined) return;
            const trimmed = name.trim();
            const memberIds = new Set(net.wires.map((wire) => wire.id));
            const firstId = net.wires[0]?.id;
            commit(
                {
                    ...state.design,
                    wires: state.design.wires.map((wire) => {
                        if (!memberIds.has(wire.id)) return wire;
                        // One label per net keeps the derived name deterministic.
                        const label = wire.id === firstId && trimmed !== '' ? trimmed : undefined;
                        return wire.label === label ? wire : { ...wire, label };
                    }),
                },
                `rename-net-${netId}`,
            );
            // Keep the active trace following the renamed net (its id IS its name).
            if (state.trace?.netId === netId && trimmed !== '') {
                const renamed = get().nets.byWire.get(firstId ?? '');
                if (renamed !== undefined) get().setTracedNet(renamed.id);
            }
        },

        undo: () => {
            const state = get();
            const previous = state.past[state.past.length - 1];
            if (previous === undefined) return;
            restore(previous, state.past.slice(0, -1), [state.design, ...state.future]);
        },
        redo: () => {
            const state = get();
            const [next, ...rest] = state.future;
            if (next === undefined) return;
            restore(next, [...state.past, state.design], rest);
        },

        clearDesign: () => {
            const { design } = get();
            const first = design.boards[0] ?? { id: newId('board'), name: 'Board 1', origin: { x: 80, y: 80 }};
            commit({ boards: [first], subsystems: [], components: [], wires: [], archVertices: {}});
            // A drill-down context or one-shot zoom target must not outlive its
            // subsystem; the trace already cleared itself through the commit.
            set({ focusSubsystemId: null, detailSubsystemId: null });
        },

        reset: () => {
            lastCoalesceKey = null;
            const state = get();
            const derived = derive(INITIAL_DESIGN, NO_EXPANDED);
            set({
                design: INITIAL_DESIGN,
                ...derived,
                trace: null,
                liveMode: false,
                expandedBundles: NO_EXPANDED,
                focusSubsystemId: null,
                detailSubsystemId: null,
                past: [...state.past.slice(-(HISTORY_CAP - 1)), state.design],
                future: [],
            });
            persistDesign(INITIAL_DESIGN);
        },
    };
});

// --- Focused selector hooks (each re-renders only on ITS slice) ------------

/** One component record by id (stable reference while untouched). */
export function useComponent(id: string) {
    return useDesignerStore((state) => state.design.components.find((component) => component.id === id));
}

/** One subsystem record by id. */
export function useSubsystem(id: string) {
    return useDesignerStore((state) => state.design.subsystems.find((subsystem) => subsystem.id === id));
}

/**
 * Everything a schematic wire renders from its net, as PRIMITIVES. The
 * derived maps are rebuilt on every commit (drag frames included), so
 * returning the Net object itself would re-render every mounted wire per
 * frame; a useShallow tuple of primitives stays referentially quiet.
 */
export function useWireLabeling(wireId: string): {
  readonly netName: string | undefined;
  readonly iface: InterfaceKind | undefined;
  readonly showLabel: boolean;
  readonly joined: boolean;
  readonly labelAt: number;
} {
    return useDesignerStore(
        useShallow((state) => {
            const net = state.nets.byWire.get(wireId);
            const wire = net?.wires.find((candidate) => candidate.id === wireId);
            // A label that JOINS disjoint groups renders on every wire carrying it
            // (each flag is a live connection point); a plain name renders once
            // per net, on its first wire — the schematic convention.
            const joined = net?.labelJoined === true && wire?.label !== undefined;
            return {
                netName: net?.name,
                iface: net?.iface,
                showLabel: net !== undefined && (joined || net.wires[0]?.id === wireId),
                joined,
                labelAt: wire?.labelAt ?? 0.5,
            };
        }),
    );
}

/** Worst finding severity badging a cell, if any. */
export function useCellFlag(cellId: string): FindingSeverity | undefined {
    return useDesignerStore((state) => state.flags.get(cellId));
}

/** Whether a cell participates in the currently traced net. */
export function useCellTraced(cellId: string): boolean {
    return useDesignerStore((state) => {
        const { trace } = state;
        if (trace === null) return false;
        return (
            trace.wires.has(cellId) ||
      trace.components.has(cellId) ||
      trace.bundles.has(cellId) ||
      trace.subsystems.has(cellId)
        );
    });
}

/** True while a trace is active but this cell is NOT part of it (dimming). */
export function useCellDimmed(cellId: string): boolean {
    const traced = useCellTraced(cellId);
    const active = useDesignerStore((state) => state.trace !== null);
    return active && !traced;
}

const NO_JUNCTIONS: ReadonlySet<string> = new Set();

/** Pins of one component that carry a junction dot. Selected as a joined
 * STRING (the junction sets are rebuilt per commit) and re-materialized only
 * when the membership actually changes. */
export function useJunctionPins(componentId: string): ReadonlySet<string> {
    const key = useDesignerStore((state) => {
        const pins = state.junctions.get(componentId);
        return pins === undefined || pins.size === 0 ? '' : [...pins].sort().join('\n');
    });
    return useMemo(() => (key === '' ? NO_JUNCTIONS : new Set(key.split('\n'))), [key]);
}
