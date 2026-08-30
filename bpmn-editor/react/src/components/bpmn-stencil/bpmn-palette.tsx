import { useEffect, useState } from 'react';
import { useGraph, usePaper, usePaperScroller, useSelectionCollection, useStencil } from '@joint/react-plus';
import { addEffect, removeEffect, EffectType } from '../../effects';
import { stencilPaletteItems, type StencilPaletteItem } from '../../configs/stencil-config';
import { dropPoolAt, findDropPool, getPoolsInOrder } from '../../dnd/pools';
import { insertSwimlaneIntoPool } from '../../dnd/swimlanes';
import { findDropSwimlane, positionInSwimlane } from '../../dnd/elements';
import { createShape, getShapeMeta } from '../../shapes/create-shape';
import { adjustPoolToContainElement, isPool, isSwimlane } from '../../utils';
import { Tip } from '../tooltip/tooltip';

import type { KeyboardEvent, PointerEvent, FocusEvent } from 'react';
import type { dia } from '@joint/plus';
import type { AppPool, AppSwimlane } from '../../shapes/pool/pool-shapes';

// How far one arrow key pans while a pool item has the focus — a pool lands
// on blank paper, so there is nothing to step through.
const SCROLL_STEP = 100;

// The arrows walk the diagram's structure rather than the canvas: one axis
// steps the pools, the other the lanes within a pool. The mapping is fixed
// on purpose — deriving it from the pool's orientation would swap the keys
// under the user on stepping from a horizontal pool to a vertical one. On
// the canvas the arrows act geometrically (move, resize); here they act
// structurally.
const STEP_KEYS: Record<string, { pools: number, lanes: number }> = {
    ArrowLeft: { pools: -1, lanes: 0 },
    ArrowRight: { pools: 1, lanes: 0 },
    ArrowUp: { pools: 0, lanes: -1 },
    ArrowDown: { pools: 0, lanes: 1 }
};

// `getSwimlanes()` is typed with the library's own lane class; the guard
// narrows it to the app's subclass, which carries `getLabelText()`.
const lanesOf = (pool: AppPool): AppSwimlane[] => pool.getSwimlanes().filter(isSwimlane);

/**
 * Where the next keyboard drop goes, held by id — cells can be removed.
 * A shape aims *at* a lane; a lane aims *between* lanes, so it can be
 * inserted anywhere in the stack rather than only appended.
 */
type Target =
    | { kind: 'lane', poolId: dia.Cell.ID, laneId: dia.Cell.ID | null }
    | { kind: 'insert', poolId: dia.Cell.ID, index: number };

/** Every place a lane can go: before each lane, and after the last. */
function insertPositions(pools: AppPool[]) {
    return pools.flatMap((pool) =>
        Array.from({ length: lanesOf(pool).length + 1 }, (_, index) => ({ pool, index })));
}

// Stepping cycles, so with two pools the same key keeps alternating between
// them rather than sticking at the end.
const wrap = (index: number, length: number) => (length > 0 ? ((index % length) + length) % length : 0);

/**
 * The shape palette. Besides the pointer drag it is operable from the
 * keyboard: the arrows aim at a pool or a lane — highlighted on the canvas
 * with the same effects a drag shows — and Enter drops the shape there.
 */
export function BpmnPalette() {

    const { graph } = useGraph();
    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const { collection: selectionCollection } = useSelectionCollection();

    // The target is explicit state that the arrows step, with the view
    // following it. Deriving it from the scroll position instead would make
    // aiming depend on how far a keypress happens to scroll.
    const [target, setTarget] = useState<Target | null>(null);
    const [focusedType, setFocusedType] = useState<string | null>(null);

    const resolve = (current: Target | null) => {
        const pool = current ? graph.getCell(current.poolId) : null;
        const laneId = current?.kind === 'lane' ? current.laneId : null;
        const lane = laneId ? graph.getCell(laneId) : null;
        return {
            pool: pool && isPool(pool) ? pool : null,
            lane: lane && isSwimlane(lane) ? lane : null
        };
    };

    // Where aiming starts when the palette takes the focus: what is
    // selected, else what is on screen, else the first pool.
    const initialTarget = (kind: Target['kind']): Target | null => {
        // Aiming starts from what is on screen, so without a viewport there
        // is nothing to aim from.
        const area = paperScroller?.getVisibleArea();
        if (!area) return null;

        const point = area.center();

        const selection = selectionCollection.toArray();

        // The pool is resolved first: selecting a pool has to win over a lane
        // that merely happens to be on screen, which may sit in another pool.
        const pool = findDropPool(graph, selection, point);
        if (!pool) return null;

        const found = findDropSwimlane(graph, selection, point);
        const lane = found && found.getParentCell() === pool ? found : lanesOf(pool)[0];

        if (kind === 'lane') return { kind, poolId: pool.id, laneId: lane?.id ?? null };

        const index = lane ? lanesOf(pool).indexOf(lane) + 1 : lanesOf(pool).length;
        return { kind, poolId: pool.id, index };
    };

    // Tabbing between a shape item and the lane item keeps the aim in the
    // same place: aiming at a lane becomes inserting just after it, and back.
    const convert = (current: Target, kind: Target['kind']): Target => {
        if (current.kind === kind) return current;

        const { pool, lane } = resolve(current);
        if (!pool) return current;

        const lanes = lanesOf(pool);

        if (kind === 'insert') {
            const index = lane ? lanes.indexOf(lane) + 1 : lanes.length;
            return { kind, poolId: pool.id, index };
        }

        const at = current.kind === 'insert' ? current.index : 0;
        return { kind, poolId: pool.id, laneId: (lanes[at] ?? lanes[lanes.length - 1])?.id ?? null };
    };

    // The highlight is a pure function of the target and the kind of item
    // focused, so it lives in an effect that also cleans up after itself.
    useEffect(() => {
        if (!paper) return;

        const clear = () => {
            removeEffect(paper, EffectType.TargetSwimlaneEmbed);
            removeEffect(paper, EffectType.TargetPool);
            removeEffect(paper, EffectType.PreviewSwimlane);
        };

        clear();

        if (!focusedType || !target) return;

        const shape = createShape(graph, focusedType);
        // A pool lands on blank paper — nothing to highlight.
        if (!shape.isElement() || isPool(shape)) return;

        const { pool, lane } = resolve(target);

        if (target.kind === 'insert') {
            const view = pool && paper.findViewByModel(pool);
            if (!pool || !view) return;

            // The same feedback a pool gets while a lane is dragged onto it:
            // an empty pool lights up, otherwise the insertion line shows
            // exactly where the lane would land.
            if (lanesOf(pool).length === 0) {
                addEffect(view, EffectType.TargetPool);
            } else {
                addEffect(view, EffectType.PreviewSwimlane, { index: target.index });
            }
            return clear;
        }

        const view = lane && paper.findViewByModel(lane);
        if (!view) return;

        // The same highlight a lane gets when an element is dragged over it.
        addEffect(view, EffectType.TargetSwimlaneEmbed);

        return clear;
    }, [paper, graph, focusedType, target]);

    // Named for assistive tech, which the highlight alone does not serve.
    const targetName = (() => {
        if (!focusedType || !target) return null;

        const shape = createShape(graph, focusedType);
        if (!shape.isElement() || isPool(shape)) return null;

        const { pool, lane } = resolve(target);

        if (target.kind === 'insert') {
            if (!pool) return null;
            const total = lanesOf(pool).length;
            const name = pool.getLabelText() || 'the diagram';
            // The position matters as much as the pool: it is what the
            // insertion line shows, and the line is no use to a screen reader.
            return `${name}, position ${target.index + 1} of ${total + 1}`;
        }

        return lane ? (lane.getLabelText() || 'the diagram') : null;
    })();

    const step = (key: string) => {
        const delta = STEP_KEYS[key];
        const pools = getPoolsInOrder(graph);
        if (!delta || !target || pools.length === 0) return;

        const { pool, lane } = resolve(target);
        const next = target.kind === 'insert'
            ? stepInsert(target, pools, pool, delta)
            : stepLane(pools, pool, lane, delta);

        if (!next) return;

        setTarget(next.target);

        // Bring the aimed-at cell into view. The zoom is left alone — it is
        // something the user set deliberately.
        paperScroller?.scrollToElement(next.show, { animation: { duration: 120 }});
    };

    // Aiming at a lane: one continuous run through every lane in the diagram,
    // with the pool step skipping to the top of the next pool.
    const stepLane = (pools: AppPool[], pool: AppPool | null, lane: AppSwimlane | null, delta: { pools: number, lanes: number }) => {
        let nextPool = pool ?? pools[0];
        let nextLane = lane;

        if (delta.pools !== 0) {
            nextPool = pools[wrap(pools.indexOf(nextPool) + delta.pools, pools.length)] ?? nextPool;
            nextLane = lanesOf(nextPool)[0] ?? null;
        }

        if (delta.lanes !== 0) {
            const lanes = pools.flatMap(lanesOf);
            if (lanes.length === 0) return null;

            const at = nextLane ? lanes.indexOf(nextLane) : 0;
            nextLane = lanes[wrap(Math.max(at, 0) + delta.lanes, lanes.length)] ?? null;

            const parent = nextLane?.getParentCell();
            if (parent && isPool(parent)) nextPool = parent;
        }

        return {
            target: { kind: 'lane', poolId: nextPool.id, laneId: nextLane?.id ?? null } as Target,
            show: nextLane ?? nextPool
        };
    };

    // Aiming between lanes: the same run, but over the gaps — before each
    // lane and after the last one, across every pool.
    const stepInsert = (current: Target & { kind: 'insert' }, pools: AppPool[], pool: AppPool | null, delta: { pools: number, lanes: number }) => {
        let nextPool = pool ?? pools[0];
        let index = current.index;

        if (delta.pools !== 0) {
            nextPool = pools[wrap(pools.indexOf(nextPool) + delta.pools, pools.length)] ?? nextPool;
            index = 0;
        }

        if (delta.lanes !== 0) {
            const positions = insertPositions(pools);
            const at = positions.findIndex((position) => position.pool === nextPool && position.index === index);
            const next = positions[wrap(Math.max(at, 0) + delta.lanes, positions.length)];
            if (!next) return null;

            nextPool = next.pool;
            index = next.index;
        }

        const lanes = lanesOf(nextPool);

        return {
            target: { kind: 'insert', poolId: nextPool.id, index } as Target,
            // Show the lane the line sits above, or the pool for the last gap.
            show: lanes[index] ?? nextPool
        };
    };

    const onFocus = (evt: FocusEvent<HTMLDivElement>) => {
        const type = (evt.target as HTMLElement).dataset?.shapeType;
        if (!type) return;

        const shape = createShape(graph, type);
        const kind: Target['kind'] = isSwimlane(shape) ? 'insert' : 'lane';

        setFocusedType(type);
        setTarget((current) => (current ? convert(current, kind) : initialTarget(kind)));
    };

    const onBlur = (evt: FocusEvent<HTMLDivElement>) => {
        // Tabbing between the palette's own buttons keeps the aim.
        if (evt.currentTarget.contains(evt.relatedTarget as Node | null)) return;

        setFocusedType(null);
        setTarget(null);
    };

    return (
        <div className="stencil-palette" onFocus={onFocus} onBlur={onBlur}>
            {stencilPaletteItems.map((item) => (
                <PaletteItem
                    key={item.type}
                    {...item}
                    target={target}
                    targetName={targetName}
                    onStep={step}
                />
            ))}
        </div>
    );
}

interface PaletteItemProps extends StencilPaletteItem {
    target: Target | null;
    targetName: string | null;
    onStep: (key: string) => void;
}

/**
 * One palette button rendering the shape icon (icon font).
 */
function PaletteItem({ type, icon, target, targetName, onStep }: PaletteItemProps) {

    const { graph } = useGraph();
    const { startCellDrag } = useStencil();
    const { paperScroller } = usePaperScroller();
    const { collection: selectionCollection } = useSelectionCollection();

    const { label } = getShapeMeta(graph, type);

    const onPointerDown = (evt: PointerEvent) => {
        startCellDrag(createShape(graph, type), evt);
    };

    // Keyboard alternative to the pointer drag (WCAG 2.1.1): the arrows aim
    // at a pool or a lane and Enter/Space drops the shape into it, so the
    // result matches what a pointer drop on that lane would have produced.
    const onKeyDown = (evt: KeyboardEvent) => {

        const shape = createShape(graph, type);
        if (!shape.isElement()) return;

        // `cmd+arrow` adds a neighbour on the canvas — the palette's plain
        // arrows are a different thing and should not answer to it.
        const delta = (evt.metaKey || evt.ctrlKey || evt.altKey) ? undefined : STEP_KEYS[evt.key];

        if (delta) {
            evt.preventDefault();

            if (!isPool(shape)) {
                onStep(evt.key);
                return;
            }

            // A pool has no target to step through, so the arrows pan.
            const center = paperScroller?.getVisibleArea().center();
            if (!paperScroller || !center) return;

            const distance = SCROLL_STEP / paperScroller.zoom();
            paperScroller.scroll(center.x + delta.pools * distance, center.y + delta.lanes * distance);
            return;
        }

        if (evt.key !== 'Enter' && evt.key !== ' ') return;
        evt.preventDefault();
        // A held key auto-repeats keydown — one shape per press.
        if (evt.repeat) return;

        // Placing a pool or a lane touches several cells — the pool, its
        // mandatory first lane, the content it wraps, the lanes the pool
        // lays out again — so it goes in one batch and undoes in one step,
        // as the pointer drop already does (the stencil batches that one).
        const batchName = 'stencil-keyboard-drop';

        const pool = target ? graph.getCell(target.poolId) : null;
        const laneId = target?.kind === 'lane' ? target.laneId : null;
        const lane = laneId ? graph.getCell(laneId) : null;

        if (isSwimlane(shape)) {
            if (!pool || !isPool(pool) || target?.kind !== 'insert') return;

            graph.startBatch(batchName);
            // At the aimed position, which is what the preview line showed.
            const swimlane = insertSwimlaneIntoPool(pool, target.index);
            graph.stopBatch(batchName);

            selectionCollection.reset([swimlane]);
            return;
        }

        // Everything below places the shape relative to what is on screen.
        const visible = paperScroller?.getVisibleArea();
        if (!visible) return;

        const { width, height } = shape.size();
        const center = visible.center();

        graph.startBatch(batchName);

        if (isPool(shape)) {
            dropPoolAt(graph, shape, center.x - width / 2, center.y - height / 2);
        } else if (lane && isSwimlane(lane)) {
            // Into the part of the aimed-at lane that is on screen, so the
            // shape lands where the user is looking.
            const laneBBox = lane.getBBox();
            const point = (laneBBox.intersect(visible) ?? laneBBox).center();
            const { x, y } = positionInSwimlane(lane, shape.size(), point);

            shape.position(x, y);
            graph.addCell(shape);
            lane.embed(shape);
            adjustPoolToContainElement(shape);
        } else {
            // No lanes in the diagram at all — the shape goes on blank paper.
            shape.position(center.x - width / 2, center.y - height / 2);
            graph.addCell(shape);
        }

        graph.stopBatch(batchName);

        selectionCollection.reset([shape]);
    };

    return (
        <Tip label={label} side="right">
            <button
                type="button"
                className="stencil-item"
                data-shape-type={type}
                aria-label={label}
                // The highlight is visual only; the target is named here so
                // it is announced with the button on focus.
                aria-describedby={targetName ? `stencil-target-${type}` : undefined}
                onPointerDown={onPointerDown}
                onKeyDown={onKeyDown}
            >
                <span className="stencil-item-icon" aria-hidden="true">{icon}</span>
                {targetName && (
                    <span id={`stencil-target-${type}`} className="sr-only">
                        Adds to {targetName}
                    </span>
                )}
            </button>
        </Tip>
    );
}
