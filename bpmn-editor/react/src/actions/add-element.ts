import { adjustPoolToContainElement, getPositionInSwimlane } from '../utils';

import type { dia, g } from '@joint/plus';
import type { BpmnSwimlane } from '../shapes/pool/pool-shapes';
import type { BpmnElement } from '../shapes/shapes-typing';

/**
 * Puts a new shape into the lane, embedding it and growing the pool.
 *
 * `clampToLane` keeps the shape within the lane's current bounds, which is
 * what a drop aimed at a lane wants. A neighbour added beside an existing
 * shape passes `false`: it has a place of its own to be, and pulling it
 * back inside would drop it on top of the shape it was added from — the
 * pool grows to take it instead.
 *
 * A shape that refuses the lane is placed but left loose. A group is the
 * case that matters: in BPMN it is an artifact, not something a
 * participant contains, and it is meant to be able to span pools and
 * lanes — so `Group.validateEmbedding()` returns false and the pointer
 * path never embeds one either.
 */
export function addElementToSwimlane(
    graph: dia.Graph,
    lane: BpmnSwimlane,
    element: dia.Element,
    point: g.PlainPoint,
    { clampToLane = true }: { clampToLane?: boolean } = {}
) {
    const embeds = (element as BpmnElement).validateEmbedding?.(lane) ?? true;
    const size = element.size();

    // Only a shape that goes into the lane is held to its bounds.
    const { x, y } = (clampToLane && embeds)
        ? getPositionInSwimlane(lane, size, point)
        : { x: point.x - size.width / 2, y: point.y - size.height / 2 };

    element.position(x, y);
    graph.addCell(element);

    if (embeds) {
        lane.embed(element);
        adjustPoolToContainElement(element);
    }

    return element;
}

/** Which way a new neighbour goes from the shape it is added to. */
