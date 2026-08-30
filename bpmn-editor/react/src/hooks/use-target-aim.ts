import { useEffect, useState } from 'react';
import { useGraph, usePaper, usePaperScroller, useSelectionCollection } from '@joint/react-plus';
import { addEffect, removeEffect, EffectType } from '../effects';
import { findDropPool, getPoolsInOrder } from '../dnd/pools';
import { findDropSwimlane } from '../dnd/elements';
import { isPool, isSwimlane } from '../utils';

import type { dia } from '@joint/plus';
import type { AppPool, AppSwimlane } from '../shapes/pool/pool-shapes';

/**
 * What is being aimed at: a lane, for something that goes *into* one, or a
 * position between lanes, for a lane that goes *among* them.
 */
export type AimKind = 'lane' | 'insert';

/** Held by id — cells can be removed while the aim is open. */
type Aim =
    | { kind: 'lane', poolId: dia.Cell.ID, laneId: dia.Cell.ID | null }
    | { kind: 'insert', poolId: dia.Cell.ID, index: number };

/**
 * The arrows walk the diagram's structure: one axis steps the pools, the
 * other the lanes within them. The mapping is fixed on purpose — deriving
 * it from the pool's orientation would swap the keys under the user on
 * stepping from a horizontal pool to a vertical one.
 */
const STEP_KEYS: Record<string, { pools: number, lanes: number }> = {
    ArrowLeft: { pools: -1, lanes: 0 },
    ArrowRight: { pools: 1, lanes: 0 },
    ArrowUp: { pools: 0, lanes: -1 },
    ArrowDown: { pools: 0, lanes: 1 }
};

/** Whether the key is one the aim answers to. */
export const isAimKey = (key: string) => key in STEP_KEYS;

// `getSwimlanes()` is typed with the library's own lane class; the guard
// narrows it to the app's subclass, which carries `getLabelText()`.
const lanesOf = (pool: AppPool): AppSwimlane[] => pool.getSwimlanes().filter(isSwimlane);

/** Every place a lane can go: before each lane, and after the last. */
const insertPositions = (pools: AppPool[]) =>
    pools.flatMap((pool) =>
        Array.from({ length: lanesOf(pool).length + 1 }, (_, index) => ({ pool, index })));

// Stepping cycles, so with two pools the same key keeps alternating between
// them rather than sticking at the end.
const wrap = (index: number, length: number) => (length > 0 ? ((index % length) + length) % length : 0);

/**
 * Aiming at a place in the diagram from the keyboard.
 *
 * The aim is explicit state that the arrows step, with the view following
 * it; deriving it from the scroll position instead would make aiming depend
 * on how far a keypress happens to scroll. While it is active the target is
 * shown on the canvas with the effects a pointer drag uses — the lane
 * highlight, or the insertion line — and named for assistive tech, which
 * the highlight alone does not serve.
 *
 * Owned by whoever invokes it: `begin()` on entering, `end()` on leaving,
 * `step()` from the arrow keys, and `target` to act on.
 */
export function useTargetAim() {

    const { graph } = useGraph();
    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const { collection: selectionCollection } = useSelectionCollection();

    const [aim, setAim] = useState<Aim | null>(null);
    const [kind, setKind] = useState<AimKind | null>(null);

    const resolve = (current: Aim | null) => {
        const pool = current ? graph.getCell(current.poolId) : null;
        const laneId = current?.kind === 'lane' ? current.laneId : null;
        const lane = laneId ? graph.getCell(laneId) : null;
        return {
            pool: pool && isPool(pool) ? pool : null,
            lane: lane && isSwimlane(lane) ? lane : null
        };
    };

    // Where aiming starts: what is selected, else what is on screen, else
    // the first pool.
    const seed = (wanted: AimKind): Aim | null => {
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

        if (wanted === 'lane') return { kind: wanted, poolId: pool.id, laneId: lane?.id ?? null };

        const index = lane ? lanesOf(pool).indexOf(lane) + 1 : lanesOf(pool).length;
        return { kind: wanted, poolId: pool.id, index };
    };

    // Switching between aiming at a lane and between lanes keeps the aim in
    // the same place: at a lane becomes inserting just after it, and back.
    const convert = (current: Aim, wanted: AimKind): Aim => {
        if (current.kind === wanted) return current;

        const { pool, lane } = resolve(current);
        if (!pool) return current;

        const lanes = lanesOf(pool);

        if (wanted === 'insert') {
            const index = lane ? lanes.indexOf(lane) + 1 : lanes.length;
            return { kind: wanted, poolId: pool.id, index };
        }

        const at = current.kind === 'insert' ? current.index : 0;
        return { kind: wanted, poolId: pool.id, laneId: (lanes[at] ?? lanes[lanes.length - 1])?.id ?? null };
    };

    // The preview is a pure function of the aim, so it lives in an effect
    // that also cleans up after itself.
    useEffect(() => {
        if (!paper) return;

        const clear = () => {
            removeEffect(paper, EffectType.TargetSwimlaneEmbed);
            removeEffect(paper, EffectType.TargetPool);
            removeEffect(paper, EffectType.PreviewSwimlane);
        };

        clear();

        if (!aim) return;

        const { pool, lane } = resolve(aim);

        if (aim.kind === 'insert') {
            const view = pool && paper.findViewByModel(pool);
            if (!pool || !view) return;

            // The same feedback a pool gets while a lane is dragged onto it:
            // an empty pool lights up, otherwise the insertion line shows
            // exactly where the lane would land.
            if (lanesOf(pool).length === 0) {
                addEffect(view, EffectType.TargetPool);
            } else {
                addEffect(view, EffectType.PreviewSwimlane, { index: aim.index });
            }
            return clear;
        }

        const view = lane && paper.findViewByModel(lane);
        if (!view) return;

        // The same highlight a lane gets when an element is dragged over it.
        addEffect(view, EffectType.TargetSwimlaneEmbed);

        return clear;
    }, [paper, graph, aim]);

    /** Starts (or re-aims) at the given kind, keeping the place. */
    const begin = (wanted: AimKind) => {
        setKind(wanted);
        setAim((current) => (current ? convert(current, wanted) : seed(wanted)));
    };

    /** Drops the aim and its preview. */
    const end = () => {
        setKind(null);
        setAim(null);
    };

    /** Moves the aim. Returns whether the key was one it answers to. */
    const step = (key: string) => {
        const delta = STEP_KEYS[key];
        const pools = getPoolsInOrder(graph);
        if (!delta) return false;
        if (!aim || pools.length === 0) return true;

        const { pool, lane } = resolve(aim);
        const next = aim.kind === 'insert'
            ? stepInsert(aim, pools, pool, delta)
            : stepLane(pools, pool, lane, delta);

        if (!next) return true;

        setAim(next.aim);

        // Bring the aimed-at cell into view. The zoom is left alone — it is
        // something the user set deliberately.
        paperScroller?.scrollToElement(next.show, { animation: { duration: 120 }});

        return true;
    };

    const { pool, lane } = resolve(aim);

    return {
        /** The current aim, or `null` when nothing is being aimed. */
        target: aim && {
            kind: aim.kind,
            pool,
            lane,
            /** Where a lane would be inserted; only for the `insert` kind. */
            index: aim.kind === 'insert' ? aim.index : null
        },
        kind,
        begin,
        end,
        step,
        /** What to announce, since the preview is no use to a screen reader. */
        name: describe(aim, pool, lane)
    };
}

function describe(aim: Aim | null, pool: AppPool | null, lane: AppSwimlane | null) {
    if (!aim) return null;

    if (aim.kind === 'insert') {
        if (!pool) return null;

        // The position matters as much as the pool: it is what the insertion
        // line shows, and the line is no use to a screen reader.
        const total = lanesOf(pool).length;
        return `${pool.getLabelText() || 'the diagram'}, position ${aim.index + 1} of ${total + 1}`;
    }

    return lane ? (lane.getLabelText() || 'the diagram') : null;
}

// Aiming at a lane: one continuous run through every lane in the diagram,
// with the pool step skipping to the top of the next pool.
function stepLane(pools: AppPool[], pool: AppPool | null, lane: AppSwimlane | null, delta: { pools: number, lanes: number }) {
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
        aim: { kind: 'lane', poolId: nextPool.id, laneId: nextLane?.id ?? null } as Aim,
        show: nextLane ?? nextPool
    };
}

// Aiming between lanes: the same run, but over the gaps — before each lane
// and after the last one, across every pool.
function stepInsert(current: Aim & { kind: 'insert' }, pools: AppPool[], pool: AppPool | null, delta: { pools: number, lanes: number }) {
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
        aim: { kind: 'insert', poolId: nextPool.id, index } as Aim,
        // Show the lane the line sits above, or the pool for the last gap.
        show: lanes[index] ?? nextPool
    };
}
