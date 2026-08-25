// Dynamic group membership by CONTAINMENT — the drawSQL/Figma behaviour: a table
// belongs to the smallest group whose bounds contain its centre. Membership is
// re-filed on exactly three signals, never on anything else:
//
//   • a table is DRAGGED directly            → re-file that one table
//   • a group is RESIZED                      → re-file every table (coverage changed)
//   • a table/group is ADDED (drawn)          → re-file the newcomer / its covered tables
//
// The critical thing this must NOT do is re-file while a GROUP is being MOVED.
// Moving a group only repositions it and its children; it must not swallow tables
// it sweeps over, nor hand its own tables to a group it passes across. joint makes
// this distinguishable: `Element.translate` stamps `opt.translateBy` on the
// change:position options with the drag's ORIGINATING cell, and propagates that
// SAME opt to every embedded child (joint-core Element.mjs `translate`). So a child
// dragged along by its group carries the GROUP's id, not its own — and a container
// moving is trivially detected by its data kind. (An earlier version recomputed all
// members on every change:position, which is exactly what produced the "empty group
// swallows nearby tables" and "drag a group past another and it steals the tables"
// bugs — and was O(tables × groups) on every mouse tick.)
//
// WHY the raw dia.Graph here (the one place the demo drops below the react API):
// a controlled-cells `setCell` can ADD a `parent` but cannot REMOVE it — the sync
// merges keys, so un-embedding never converges and an effect that retries loops
// forever. `element.embed()/unembed()` mutate the graph (the source of truth) and
// the change flows back out through onCellsChange, so it converges. This belongs in
// joint-react-plus as a `useContainmentEmbedding()` feature — promote it when able.
// The SUBSCRIPTION side is the library's, though: `useOnGraphEvents` owns the
// wiring/cleanup, and the containment hit-test goes through
// `graph.findElementsAtPoint` (quad-tree backed under `<Diagram spatialIndex>`).
// ponytail: raw graph writes are deliberate + isolated to this hook; see above.
// @todo maybe good candidate for a library!

import { useEffect } from 'react';
import { useGraph, useOnGraphEvents, usePaper, type GraphApi } from '@joint/react-plus';

// Membership ring: flash the moved card green (joined a group) / red (left one).
// joint-react renders each HTMLBox card inside a <foreignObject> UNDER its
// `[model-id]` node, so the card carries `[data-node-card]` and we toggle a CSS
// class on it directly — reliable + visible (native highlighters can't attach; the
// react cell views are detached — see joint-react-per-cell-highlight-gap).
const FLASH_MS = 850;

// Use a data-attribute, NOT a class: React OWNS the card's `className` and re-applies
// it (wiping any class we add) on the re-render that the embed/unembed triggers. It
// does NOT manage attributes absent from the JSX, so `data-flash` survives re-render.
function flashCard(cellId: string, kind: 'added' | 'removed'): void {
    const card = document.querySelector(`[model-id="${cellId}"] [data-node-card]`);
    if (!(card instanceof HTMLElement)) return;
    card.removeAttribute('data-flash');
    void card.offsetWidth; // restart the animation if it re-flashes quickly
    card.setAttribute('data-flash', kind);
    window.setTimeout(() => {
        if (card.getAttribute('data-flash') === kind) card.removeAttribute('data-flash');
    }, FLASH_MS);
}

// Live drop-target outline: mark the group a dragged table currently sits inside, so
// its border lights up (index.css `[data-embed-target]`) for the whole drag. We draw
// this OURSELVES rather than via joint's `embeddingMode` highlight: this demo embeds by
// CENTRE-containment on every move (relocate), so by the time joint's own
// processEmbedding runs the table is already the group's child — joint only highlights
// a NEW candidate parent, so the destination never lit up ("highlighters removed after
// a while"). `root` is the MAIN paper element, so the minimap (a separate paper) is not
// touched. Set on the joint-owned `[model-id]` node, which survives React re-renders.
function markDropTarget(root: Element, groupId: string | null): void {
    for (const node of root.querySelectorAll('[data-embed-target]')) {
        node.removeAttribute('data-embed-target');
    }
    if (groupId) root.querySelector(`[model-id="${groupId}"]`)?.setAttribute('data-embed-target', '');
}

// dia types derived from the public GraphApi handle, so the hook still needs no
// `@joint/core` import.
type Graph = GraphApi['graph'];
type GraphElement = ReturnType<Graph['getElements']>[number];

export function useContainmentEmbedding(
    isContainer: (data: unknown) => boolean,
    // A COLLAPSED group keeps its members (they're only hidden), so it is never a
    // re-file target, its members are never un-embedded, and its collapse resize
    // (shrink-to-header) must not trigger a recompute — otherwise the members fall
    // outside the tiny header and un-embed, and the collapse-visibility (which hides
    // by ancestor) can no longer hide them.
    isCollapsedContainer: (data: unknown) => boolean,
    // Only these elements may be embedded into a group (tables). NOTES are excluded —
    // they float freely and must never move with a group, so they are never re-filed.
    isEmbeddable: (data: unknown) => boolean,
): void {
    const { graph } = useGraph();
    // The paper is only needed for the drop-target outline (it owns the DOM root).
    const { paper } = usePaper();

    // The smallest EXPANDED group whose bounds contain the element's centre (the
    // containment rule), or undefined when it sits over no group. The point query
    // goes through the graph API — a quad-tree lookup under <Diagram spatialIndex>.
    const findContainingGroup = (element: GraphElement): GraphElement | undefined => {
        const centre = element.getBBox().center();
        let target: GraphElement | undefined;
        let targetArea = Infinity;
        for (const container of graph.findElementsAtPoint(centre)) {
            if (container.id === element.id) continue;
            const containerData = container.get('data');
            if (!isContainer(containerData)) continue;
            if (isCollapsedContainer(containerData)) continue; // folded: not a target
            const box = container.getBBox();
            const area = box.width * box.height;
            if (area < targetArea) {
                target = container;
                targetArea = area;
            }
        }
        return target;
    };

    // Re-file ONE table into its containing group, or un-embed it when it sits outside
    // every group. Returns the group the table now belongs to (for the drag highlight),
    // or undefined.
    const relocate = (element: GraphElement): GraphElement | undefined => {
    // Notes (and anything non-embeddable) never join a group.
        if (!isEmbeddable(element.get('data'))) return undefined;
        const parent = element.getParentCell();
        // A member of a COLLAPSED group is only HIDDEN, not free: its stale position
        // may now fall inside another group's bounds, but it still belongs to the
        // folded group. Never re-file or un-embed it here (a recompute triggered by an
        // unrelated group's resize/move must not steal it).
        if (parent && isCollapsedContainer(parent.get('data'))) return undefined;
        const target = findContainingGroup(element);
        if (target) {
            if (parent?.id !== target.id) {
                // Un-embed the old parent first — joint forbids embedding a cell that is
                // still embedded elsewhere ("Embedding of already embedded cells...").
                if (parent) parent.unembed(element);
                target.embed(element);
                flashCard(String(element.id), 'added');
            }
            return target;
        }
        if (parent && isContainer(parent.get('data')) && !isCollapsedContainer(parent.get('data'))) {
            // Keep members of a collapsed group — they're hidden, not removed.
            parent.unembed(element);
            flashCard(String(element.id), 'removed');
        }
        return undefined;
    };

    const recomputeAll = (): void => {
        for (const element of graph.getElements()) {
            if (!isContainer(element.get('data'))) relocate(element);
        }
    };

    // The three signals, bound through the library (`useOnGraphEvents` keeps the
    // handlers always-latest, so predicate-prop identity changes don't resubscribe).
    useOnGraphEvents({
    // Only a DIRECT drag of a table re-files it. A group being moved (a container)
    // and a child dragged along by its group (`translateBy` !== its own id) are both
    // skipped — see the header note. The handler receives a typed dia.Cell;
    // `isElement()` narrows it (position only ever changes on elements).
        'change:position': (cell, _position, opt) => {
            if (!cell.isElement()) return;
            if (isContainer(cell.get('data'))) return;
            // Stamped by joint-core Element.translate onto the change:position options.
            const translateBy: unknown = opt.translateBy;
            if (translateBy !== undefined && translateBy !== cell.id) return;
            const target = relocate(cell);
            // Light up the group this table is currently over, for the whole drag.
            if (paper?.el) markDropTarget(paper.el, target ? String(target.id) : null);
        },
        // Resizing a group changes what it covers → re-file every table. A COLLAPSE
        // resize (shrink-to-header) is not a coverage change — skip it, or the members
        // would fall outside the header and un-embed. (joint sets all attributes before
        // firing change:size, so `data` already carries the fresh collapsed flag here.)
        'change:size': (cell) => {
            const data = cell.get('data');
            if (isContainer(data) && !isCollapsedContainer(data)) recomputeAll();
        },
        // A new table lands in whatever group covers it; a new group claims the tables
        // it was drawn over. DEFERRED past the current sync batch: during a controlled
        // cells REPLACE (Import), new tables are added while the OUTGOING groups are
        // still in the graph — an immediate relocate would embed the newcomer into a
        // dying group, and that change:embeds re-emits the group through onCellsChange,
        // resurrecting it in state (the "old groups survive an import" bug). After the
        // microtask the replace has settled and the dead groups are gone.
        add: (cell) => {
            queueMicrotask(() => {
                if (!graph.getCell(cell.id)) return; // removed again within the same batch
                if (isContainer(cell.get('data'))) {
                    recomputeAll();
                    return;
                }
                const element = graph.getElements().find((el) => el.id === cell.id);
                if (element) relocate(element);
            });
        },
    });

    // Clear the drop-target outline once the drag ends (capture phase so it runs even
    // if the pointer-up lands on a control that stops propagation).
    useEffect(() => {
        if (!paper) return;
        const onPointerUp = (): void => {
            if (paper.el) markDropTarget(paper.el, null);
        };
        document.addEventListener('pointerup', onPointerUp, true);
        return () => {
            document.removeEventListener('pointerup', onPointerUp, true);
            if (paper.el) markDropTarget(paper.el, null);
        };
    }, [paper]);
}
