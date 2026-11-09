// The canvas area — one <Diagram> per view, both CONTROLLED by the store.
//
// Switching tabs swaps which Diagram is mounted; nothing is lost because the
// canvases own no state — cells are derived from the Design, and the trace /
// live-mode / validation state lives in the store, so a net traced in the
// architecture view is still lit when the connectivity view opens.

import { memo, useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react';
import {
    Diagram,
    FreeTransform,
    getSelectionDefaultHandle,
    Paper,
    PaperScroller,
    Selection,
    Snaplines,
    useCells,
    usePaper,
    usePaperScroller,
    useSelectionCollection,
    type CellId,
    type SelectionWrapperOptions,
} from '@joint/react-plus';
import type { dia } from '@joint/plus';
import { X } from 'lucide-react';
import { endCoalescing, useDesignerStore } from '@/state/designer-store';
import { useAnnouncer } from '@/components/ui/announcer-context';
import { Button } from '@/components/ui/button';
import { RenderArchCell, RenderArchLink } from './render-arch';
import { RenderSchCell, RenderSchLink } from './render-sch';
import { useAvoidRouting } from './use-avoid-routing';
import { WireEndTools } from './wire-end-tools';
import {
    ARCH_LINK_ROUTING,
    CONNECT_HIGHLIGHTING,
    createDraftLink,
    SCH_LINK_ROUTING,
    VALIDATE_CONNECTION,
} from './paper-config';
import { parseBundleWireCellId } from '@/views/arch-cells';
import { parseFrameCellId } from '@/views/sch-cells';
import { NavigatorPanel } from './navigator-panel';
import { AccessibilityCheck } from './accessibility-check';
import { DesignerPalette } from '@/palette/palette';
import { DesignerInspector } from '@/inspector/inspector';

// Selection wrapper: keep ONLY the remove handle. Move is a plain body drag;
// rotate/resize/clone don't apply to fixed-footprint symbols. Visible for ANY
// selection (the default shows it only for 2+): the frame + remove handle is
// the visible "this is selected" answer for a single click too.
const SELECTION_WRAPPER: SelectionWrapperOptions = {
    visibility: (collection) => collection.length > 0,
    handles: () => [getSelectionDefaultHandle('remove')],
};

// Whole-sheet fit padding, shared by every "show the whole system" moment.
// Desktop reserves room for the floating palette (left) and the properties
// panel (right); on small screens neither floats over the sides (the palette
// is hidden, the inspector is a bottom sheet), so reserving 594 px of side
// padding there squeezed the fit to ~20% zoom — unreadable on a phone.
function fitPadding(): {
  readonly padding: { left: number; right: number; top: number; bottom: number };
  readonly minScale?: number;
  readonly maxScale: number;
  } {
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    // Mobile keeps a readability FLOOR: fitting the whole sheet into a phone
    // lands at ~25% (illegible); clamping at 0.5 shows a readable region and
    // leaves the rest to panning — the phone is for READING a design, and an
    // unreadable overview serves nobody.
    return desktop
        ? { padding: { left: 264, right: 330, top: 32, bottom: 40 }, maxScale: 1 }
        : { padding: { left: 16, right: 16, top: 24, bottom: 72 }, minScale: 0.5, maxScale: 1 };
}

type Scroller = NonNullable<ReturnType<typeof usePaperScroller>['paperScroller']>;

/**
 * Zooms `rect` (paper coordinates) into the canvas area left free by the
 * floating panels. `zoomToRect` centres on the whole viewport and only uses
 * the padding for the scale, so the centre is shifted by half the padding
 * difference afterwards, or the parts end up under the palette or inspector.
 */
function frameRect(paperScroller: Scroller, rect: dia.BBox): void {
    const { padding, maxScale } = fitPadding();
    paperScroller.zoomToRect(rect, { padding, maxScale });
    const scale = paperScroller.zoom();
    paperScroller.center(
        rect.x + rect.width / 2 + (padding.right - padding.left) / 2 / scale,
        rect.y + rect.height / 2 + (padding.bottom - padding.top) / 2 / scale,
    );
}

// Fit the sheet into view once per mount (per view switch). A pending
// drill-down target (set by "Open detailed connectivity" / double-click)
// lands on that subsystem's parts instead, so the detail you asked for is
// what fills the screen. INSTANT on purpose: the canvas has just mounted, so
// there is no visible "before" to animate from. Never `transitionToRect` with
// a 0ms duration: a zero-length CSS transition fires no `transitionend`, so
// PaperScroller never syncs its scroll position — the view stays a stale CSS
// transform and virtual rendering culls parts that are on screen.
function FitOnLoad() {
    const { paperScroller, zoomToFit } = usePaperScroller();
    // Captured once per mount: the effect clears the store's target, and
    // StrictMode re-runs the effect, so a second read would find it gone and
    // fit the whole sheet instead.
    const [focusSubsystemId] = useState(() => useDesignerStore.getState().focusSubsystemId);
    useEffect(() => {
        const { design, clearFocusSubsystem } = useDesignerStore.getState();
        if (focusSubsystemId !== null && paperScroller) {
            clearFocusSubsystem();
            const graph = paperScroller.options.paper.model;
            const members = design.components
                .filter((component) => component.subsystemId === focusSubsystemId)
                .flatMap((component) => graph.getCell(component.id) ?? []);
            const bounds = graph.getCellsBBox(members);
            if (bounds !== null) {
                frameRect(paperScroller, bounds);
                return;
            }
        }
        zoomToFit(fitPadding());
    }, [focusSubsystemId, paperScroller, zoomToFit]);
    return null;
}

/**
 * The spec's drill-down breadcrumb: "System / <subsystem>". It answers the
 * question the Connectivity tab alone can't — WHOSE detail is on screen —
 * and "System" is the way back: clear the context and refit the whole sheet.
 */
function DetailBreadcrumb() {
    const detailName = useDesignerStore((state) => {
        const id = state.detailSubsystemId;
        return id === null
            ? null
            : state.design.subsystems.find((subsystem) => subsystem.id === id)?.name ?? null;
    });
    const clearSubsystemDetail = useDesignerStore((state) => state.clearSubsystemDetail);
    const { zoomToFit } = usePaperScroller();
    const announce = useAnnouncer();
    if (detailName === null) return null;
    return (
        <nav
            aria-label="Connectivity scope"
            className="chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 bg-card/95 py-1 pl-1 pr-3 text-xs shadow-(--panel-shadow)"
        >
            <Button
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                    clearSubsystemDetail();
                    zoomToFit(fitPadding());
                    announce('Showing the whole system');
                }}
            >
        System
            </Button>
            <span aria-hidden className="text-muted-foreground">
        /
            </span>
            <span className="font-semibold">{detailName}</span>
            <span className="text-muted-foreground">wiring</span>
        </nav>
    );
}

/**
 * Click-to-trace + bus expansion, on the Paper's own React event props (the
 * custom wire SVG keeps `pointer-events: none`, so the native wrapper is what
 * gets clicked): click traces the wire's whole net, double-click expands or
 * collapses a multi-signal bundle, blank click clears the trace.
 */
function useSheetPointerHandlers() {
    const announce = useAnnouncer();

    const onLinkPointerClick = ({ id }: { readonly id: CellId }): void => {
        const cellId = String(id);
        const state = useDesignerStore.getState();
        // A schematic wire maps to its net directly; an expanded member carries
        // its wire id inside its cell id; a collapsed bundle traces its first
        // member signal.
        const member = parseBundleWireCellId(cellId);
        const net =
      state.nets.byWire.get(cellId) ??
      (member === null ? undefined : state.nets.byWire.get(member.wireId)) ??
      (() => {
          const bundle = state.bundles.bundles.find((candidate) => candidate.id === cellId);
          const wireId = bundle?.wireIds[0];
          return wireId === undefined ? undefined : state.nets.byWire.get(wireId);
      })();
        if (net === undefined) return;
        state.setTracedNet(net.id);
        announce(`Tracing net ${net.name} — ${net.pins.length} pins`);
    };

    const onLinkPointerDblClick = ({ id }: { readonly id: CellId }): void => {
        const cellId = String(id);
        const state = useDesignerStore.getState();
        // Collapsed bundle with several signals → expand; expanded member → collapse.
        const bundle = state.bundles.bundles.find((candidate) => candidate.id === cellId);
        const member = parseBundleWireCellId(cellId);
        const target =
      member?.bundleId ?? (bundle !== undefined && bundle.wireIds.length > 1 ? bundle.id : undefined);
        if (target === undefined) return;
        state.toggleBundle(target);
        const expanded = useDesignerStore.getState().expandedBundles.has(target);
        announce(expanded ? 'Bus expanded into its signals' : 'Bus collapsed');
    };

    const onBlankPointerClick = (): void => {
        const state = useDesignerStore.getState();
        if (state.trace !== null) {
            state.setTracedNet(null);
            announce('Trace cleared');
        }
    };

    // Double-click a subsystem BLOCK → its detailed connectivity (the same
    // drill-down as Enter and the inspector button, on the expected gesture).
    // Schematic components aren't subsystems, so this is a no-op there.
    const onElementPointerDblClick = ({ id }: { readonly id: CellId }): void => {
        const state = useDesignerStore.getState();
        const subsystem = state.design.subsystems.find((candidate) => candidate.id === String(id));
        if (subsystem === undefined) return;
        state.openSubsystemDetail(subsystem.id);
        announce(`Opening detailed connectivity for ${subsystem.name}`);
    };

    return { onLinkPointerClick, onLinkPointerDblClick, onBlankPointerClick, onElementPointerDblClick };
}

/** The active-trace pill: names the traced net, counts its reach, and offers
 * the one obvious way OUT of trace mode (blank canvas click also clears). */
function TracePill() {
    const trace = useDesignerStore((state) => state.trace);
    const setTracedNet = useDesignerStore((state) => state.setTracedNet);
    const announce = useAnnouncer();
    if (trace === null) return null;
    return (
    // Bottom center on desktop; TOP center on small screens, where the
    // bottom edge belongs to the inspector sheet.
        <div className="chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 bg-card/95 py-1 pl-3 pr-1 shadow-(--panel-shadow) max-md:top-14 md:bottom-4">
            <span aria-hidden className="size-2 rounded-full bg-live" />
            <span className="text-xs">
        Tracing <span className="font-mono font-semibold">{trace.netName}</span>
                <span className="text-muted-foreground">
                    {' '}
          · {trace.wires.size} wires · {trace.subsystems.size} subsystems
                </span>
            </span>
            <Button
                size="icon"
                aria-label={`Stop tracing net ${trace.netName}`}
                onClick={() => {
                    setTracedNet(null);
                    announce('Trace cleared');
                }}
            >
                <X className="size-3.5" aria-hidden />
            </Button>
        </div>
    );
}

/**
 * Feedback for the last drawn connection: a chamfered slip that rises above
 * the trace pill, ticked in the connection's interface hue — green-lit nets
 * read as data, an immediately-flagged connect turns the tick amber and
 * names the finding, a declined one explains itself in red. One at a time,
 * latest wins, gone on its own after a beat.
 */
function ConnectionToast() {
    const toast = useDesignerStore((state) => state.toast);
    const dismissToast = useDesignerStore((state) => state.dismissToast);
    const announce = useAnnouncer();

    useEffect(() => {
        if (toast === null) return;
        // Spoken through the app's one persistent live region: a region that
        // mounts WITH its text is not reliably announced by screen readers.
        announce(toast.detail === undefined ? toast.title : `${toast.title} — ${toast.detail}`);
        const timer = setTimeout(dismissToast, 4200);
        return () => clearTimeout(timer);
    }, [toast, dismissToast, announce]);

    if (toast === null) return null;
    return (
        <div
            key={toast.id}
            data-kind={toast.kind}
            data-iface={toast.iface}
            className="esd-toast chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 bg-card/95 py-1.5 pl-3 pr-1 shadow-(--panel-shadow) max-md:top-14 md:bottom-16"
        >
            <span aria-hidden className="esd-toast-tick" />
            <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold">{toast.title}</span>
                {toast.detail === undefined ? null : (
                    <span className="font-mono text-[11px] text-muted-foreground">{toast.detail}</span>
                )}
            </div>
            <Button size="icon" aria-label="Dismiss" onClick={dismissToast}>
                <X className="size-3.5" aria-hidden />
            </Button>
        </div>
    );
}

/** Keyboard + assistive-tech plumbing for the scroll container and symbols
 * (focus selects, keyboard focus pans off-screen symbols into view, ESC hops
 * back to the toolbar). Same contract as the Data Modeling demo. */
function useCanvasAccessibility(rootRef: RefObject<HTMLDivElement | null>, label: string) {
    const { selectCells } = useSelectionCollection();
    const { paperScroller } = usePaperScroller();
    const { paper } = usePaper();

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        // Imperative on purpose: mvc `attributes` only apply when the view
        // CREATES its own element (joint-core mvc/View `_ensureElement`), and the
        // React PaperScroller passes its own `el` in — so the `options.attributes`
        // escape hatch never reaches this element. Setting them here is the one
        // way to name the scroll container.
        const scroller = root.querySelector('.jj-paper-scroller');
        if (scroller instanceof HTMLElement) {
            scroller.tabIndex = 0;
            scroller.setAttribute('role', 'application');
            scroller.setAttribute('aria-label', `${label} — scrollable; use arrow keys to pan`);
        }

        let pointerInitiated = false;
        const onPointerDownFlag = (): void => {
            pointerInitiated = true;
        };
        const onPointerUpFlag = (): void => {
            pointerInitiated = false;
            // A released drag ends its undo-coalescing window, so two quick drags
            // stay two separate history entries.
            endCoalescing();
        };
        document.addEventListener('pointerdown', onPointerDownFlag, true);
        document.addEventListener('pointerup', onPointerUpFlag, true);

        const onFocusIn = (event: FocusEvent): void => {
            const target = event.target;
            const view = target instanceof Element ? target.closest('[model-id]') : null;
            const id = view?.getAttribute('model-id');
            if (!id || !(view instanceof Element)) return;
            selectCells([id]);
            if (pointerInitiated) {
                pointerInitiated = false;
                return;
            }
            const viewport = scroller instanceof HTMLElement ? scroller.getBoundingClientRect() : null;
            const box = view.getBoundingClientRect();
            const offScreen =
        !!viewport &&
        (box.top < viewport.top ||
          box.bottom > viewport.bottom ||
          box.left < viewport.left ||
          box.right > viewport.right);
            if (offScreen && paperScroller && paper) {
                const cell = paper.model.getCell(id);
                if (cell && 'getBBox' in cell) {
                    const bbox = cell.getBBox();
                    // Reduced motion pans instantly. Not a 0ms transition: that never
                    // fires `transitionend` and leaves the scroller stuck (see FitOnLoad).
                    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        const center = bbox.center();
                        paperScroller.center(center.x, center.y);
                    } else {
                        const scale = paper.scale().sx;
                        paperScroller.transitionToRect(bbox, {
                            maxScale: scale,
                            minScale: scale,
                            visibility: 0.7,
                            duration: '250ms',
                            timingFunction: 'ease-out',
                        });
                    }
                }
            }
        };
        root.addEventListener('focusin', onFocusIn);

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;
            const active = document.activeElement;
            if (!(active instanceof Element) || !active.closest('[model-id]')) return;
            const toolbarTarget = document.querySelector('[data-canvas-escape]');
            if (toolbarTarget instanceof HTMLElement) {
                event.preventDefault();
                toolbarTarget.focus();
            }
        };
        root.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDownFlag, true);
            document.removeEventListener('pointerup', onPointerUpFlag, true);
            root.removeEventListener('focusin', onFocusIn);
            root.removeEventListener('keydown', onKeyDown);
        };
    }, [rootRef, selectCells, paperScroller, paper, label]);

    // Pressing a MAGNET starts a wire instead of a plain element press, so the
    // owner wouldn't get selected. The React event map has click/dblclick for
    // magnets but no pointerdown, so this one binding stays on the raw paper
    // event; plain element presses use the `onElementPointerDown` prop.
    useEffect(() => {
        if (!paper) return;
        const selectOwner = (elementView: { model: { id: CellId } }): void => {
            selectCells([elementView.model.id]);
        };
        paper.on('element:magnet:pointerdown', selectOwner);
        return () => {
            paper.off('element:magnet:pointerdown', selectOwner);
        };
    }, [paper, selectCells]);
}

/** Resize handles for a selected board outline. Parts and blocks have fixed
 * footprints, so FreeTransform attaches ONLY to frame cells; the write-back
 * turns the resize into the board's stored outline rect. The selector keeps
 * the subscription to the ID ONLY — cell records are replaced per attribute
 * commit, so subscribing to the records would re-render every drag frame. */
function BoardResizeHandles() {
    const { collection } = useSelectionCollection();
    const frameId = useCells(collection, (cells): CellId | null => {
        const single = cells.length === 1 ? cells[0] : undefined;
        return single !== undefined &&
      typeof single.id === 'string' &&
      parseFrameCellId(single.id) !== undefined
            ? single.id
            : null;
    });
    if (frameId === null) return null;
    return <FreeTransform cell={frameId} allowRotation={false} minWidth={160} minHeight={120} />;
}

interface SheetProps {
  readonly label: string;
  readonly renderElement: ComponentProps<typeof Paper>['renderElement'];
  readonly renderLink: ComponentProps<typeof Paper>['renderLink'];
  readonly linkRouting: ComponentProps<typeof Paper>['linkRouting'];
  /** Rendered INSIDE the paper (needs its context): tools, overlays. */
  readonly paperChildren?: ReactNode;
  /** Rendered BEFORE the scroller — the palette rail. Tab order is DOM
   * order, and the rail sits left of the sheet, so it must come first. */
  readonly rail?: ReactNode;
  readonly children?: ReactNode;
}

/** Everything inside one <Diagram>: paper, selection, palette, inspector. */
const Sheet = memo(function Sheet({
    label,
    renderElement,
    renderLink,
    linkRouting,
    paperChildren,
    rail,
    children,
}: SheetProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    useCanvasAccessibility(rootRef, label);
    const { collection, selectCells } = useSelectionCollection();
    const pointerHandlers = useSheetPointerHandlers();

    return (
    // esd-sheet: draws the scroller's keyboard-focus ring (index.css).
        <div ref={rootRef} className="esd-sheet relative size-full">
            <div aria-hidden className="canvas-wash pointer-events-none absolute inset-0" />
            {rail}
            <PaperScroller className="relative size-full touch-none" virtualRendering>
                <Paper
                    className="size-full"
                    gridSize={4}
                    drawGridSize={20}
                    renderElement={renderElement}
                    renderLink={renderLink}
                    linkRouting={linkRouting}
                    validateConnection={VALIDATE_CONNECTION}
                    highlighting={CONNECT_HIGHLIGHTING}
                    defaultLink={createDraftLink}
                    magnetThreshold="onleave"
                    linkPinning={false}
                    // Geometric snapping: while drawing a wire, the end snaps to the
                    // nearest valid pin within 40px — forgiving to aim at small pin
                    // stubs, and connection no longer depends on the pointer being
                    // pixel-perfectly over the magnet at drop time.
                    snapLinks={{ radius: 40 }}
                    clickThreshold={10}
                    // Pressing an UNSELECTED symbol selects it right away, so the frame
                    // and inspector follow the press. Guarded so the library's built-in
                    // click-selection keeps working: modifier presses (Ctrl/Cmd toggle,
                    // Shift region) and presses on already-selected cells (multi-cell
                    // drag) are left to the default interactions.
                    onElementPointerDown={({ id, event }) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey) return;
                        if (collection.get(id)) return;
                        selectCells([id]);
                    }}
                    onLinkPointerClick={pointerHandlers.onLinkPointerClick}
                    onLinkPointerDblClick={pointerHandlers.onLinkPointerDblClick}
                    onElementPointerDblClick={pointerHandlers.onElementPointerDblClick}
                    onBlankPointerClick={pointerHandlers.onBlankPointerClick}
                >
                    <Selection wrapper={SELECTION_WRAPPER} />
                    <BoardResizeHandles />
                    <Snaplines />
                    <FitOnLoad />
                    {paperChildren}
                </Paper>
            </PaperScroller>
            {children}
            <TracePill />
            <ConnectionToast />
            {/* Raised above the inspector's collapsed bar on small screens. */}
            <div className="absolute right-4 z-10 max-md:bottom-14 md:bottom-4">
                <NavigatorPanel />
            </div>
            {/* "Check accessibility" pill; clears the palette rail once visible.
          Hidden on phones — its report panel needs desktop room, and the
          bottom edge belongs to the inspector sheet there. */}
            <div className="absolute bottom-4 left-4 z-10 max-md:hidden md:left-64">
                <AccessibilityCheck />
            </div>
        </div>
    );
});

// Hoisted chrome: the canvas components re-render on EVERY cells commit
// (drag frames included). Static element trees keep memo(Sheet)'s children
// prop referentially identical, so those re-renders stop at the memo and the
// palette/inspector never reconcile mid-drag.
const ARCH_RAIL = <DesignerPalette view="architecture" />;
const ARCH_CHROME = <DesignerInspector view="architecture" />;
const SCH_RAIL = (
    <>
        <DesignerPalette view="connectivity" />
        <DetailBreadcrumb />
    </>
);
const SCH_CHROME = <DesignerInspector view="connectivity" />;
// Hoisted for the same reason: a fresh element per render would miss the memo.
const SCH_PAPER_TOOLS = <WireEndTools />;

/** The architecture sheet: subsystem blocks + typed interface bundles. */
export const ArchitectureCanvas = memo(function ArchitectureCanvas() {
    const cells = useDesignerStore((state) => state.archCells);
    const onCellsChange = useDesignerStore((state) => state.onArchCellsChange);
    return (
        <Diagram cells={cells} onCellsChange={onCellsChange}>
            <Sheet
                label="System architecture canvas"
                renderElement={RenderArchCell}
                renderLink={RenderArchLink}
                linkRouting={ARCH_LINK_ROUTING}
                rail={ARCH_RAIL}
            >
                {ARCH_CHROME}
            </Sheet>
        </Diagram>
    );
});

/** Mount point for the libavoid routing service — needs the Diagram's graph. */
function AvoidRouting() {
    useAvoidRouting();
    return null;
}

/** The connectivity sheet: schematic parts + pin-to-pin wires. */
export const ConnectivityCanvas = memo(function ConnectivityCanvas() {
    const cells = useDesignerStore((state) => state.schCells);
    const onCellsChange = useDesignerStore((state) => state.onSchCellsChange);
    return (
        <Diagram cells={cells} onCellsChange={onCellsChange}>
            <AvoidRouting />
            <Sheet
                label="Detailed connectivity canvas"
                renderElement={RenderSchCell}
                renderLink={RenderSchLink}
                linkRouting={SCH_LINK_ROUTING}
                paperChildren={SCH_PAPER_TOOLS}
                rail={SCH_RAIL}
            >
                {SCH_CHROME}
            </Sheet>
        </Diagram>
    );
});
