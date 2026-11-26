import { useClipboard, useGraph, usePaper, useSelectionCollection, type CellId, type LinkRecord } from '@joint/react-plus';
import { dia } from '@joint/plus';
import { isConnectionData, withConnectionLook, type ConnectionData } from '../connections/connections';
import { LAYERS, isLayer, type Layer } from '../plant/layers';
import { GROUP } from '../shapes/diagram';
import { portMapOf, shapePortsOf } from '../shapes/geometry';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import type { Flip, ShapeData } from '../shapes/types';
import { GRID_SIZE } from './connection-rules';
import { fitGroupsOf, GROUP_PADDING, isGroupCell, parentIdOf } from './group-levels';
import { createShape, nextTag, seriesOf } from './new-cells';
import { withoutKey } from './objects';
import { PAPER_ID } from './paper-id';

/** An axis a shape is flipped along. */
export type FlipAxis = 'x' | 'y';

// How far disconnected elements move off the ends of their links: the gap shows they are not connected.
const DISCONNECT_SHIFT = 2 * GRID_SIZE;
// A copy is pasted this far from the original (two grid steps: the centers stay on the grid).
const PASTE_OFFSET = { dx: 2 * GRID_SIZE, dy: 2 * GRID_SIZE };
// A group is copied with its members.
const CLIPBOARD_OPTIONS = { deep: true };
// More z steps than one layer holds: in the draw order the layer always wins over the z.
const LAYER_STRIDE = 1e6;

type Point = { readonly x: number; readonly y: number };
type LinkEnd = NonNullable<LinkRecord['source']>;

/** What a half of a split link has of its own: its ends, its vertices, its ID. */
interface HalfOfLink {
    readonly source: LinkEnd;
    readonly target: LinkEnd;
    readonly vertices: readonly Point[];
    /** The ID of the half: none - the link's (the first half keeps it). */
    readonly tag?: string;
}

/** The data of the cell, if it is a shape's or a connection's. */
export function dataOfCell(cell: dia.Cell | undefined): ShapeData | undefined {
    const data: unknown = cell?.get('data');
    return isShapeData(data) ? data : undefined;
}

/** The IDs of the cells of the graph. */
function tagsOf(graph: dia.Graph): string[] {
    return graph.getCells().flatMap((cell) => dataOfCell(cell)?.tag ?? []);
}

/** The layer of the cell (the equipment one if none). */
export function layerOfCell(graph: dia.Graph, cell: dia.Cell): Layer {
    const layer = graph.getCellLayerId(cell);
    return isLayer(layer) ? layer : 'cells';
}

/** The flip toggled along the axis: `''` when it is flipped back. */
function toggledFlip(flip: Flip | undefined, axis: FlipAxis): Flip | undefined {
    const axes = new Set((flip ?? '').split(''));
    if (axes.has(axis)) {
        axes.delete(axis);
    } else {
        axes.add(axis);
    }
    const next = ['x', 'y'].filter((value) => axes.has(value)).join('');
    return next === 'x' || next === 'y' || next === 'xy' ? next : undefined;
}

/** The order cells are drawn in, bottom first: by layer, then within it. */
function drawOrder(graph: dia.Graph, cell: dia.Cell): number {
    return LAYERS.indexOf(layerOfCell(graph, cell)) * LAYER_STRIDE + cell.z();
}

/** The side a direction points to. */
function sideOfDirection({ x, y }: Point): 'left' | 'right' | 'top' | 'bottom' {
    if (Math.abs(x) >= Math.abs(y)) {
        return x >= 0 ? 'right' : 'left';
    }
    return y >= 0 ? 'bottom' : 'top';
}

/**
 * The editing actions of the selection (the context menus and the keyboard): each one step of the history.
 */
export function useEditorActions() {
    const { graph, setCell, setCellData, removeCells, transaction } = useGraph();
    const { collection, selectCells } = useSelectionCollection();
    const { paper } = usePaper(PAPER_ID);
    const { copyCells, pasteCells, pasteCellsAtPoint } = useClipboard();

    const selected = (): dia.Cell[] => collection.toArray();
    const selectedIds = (): CellId[] => selected().map((cell) => cell.id);
    const isLocked = (cell: dia.Cell) => dataOfCell(cell)?.locked === true;

    /** The selected shapes that can be flipped along the axis. */
    const flipTargets = (axis: FlipAxis) => selected().filter((cell) => {
        const flippable = specOf(dataOfCell(cell)?.kind)?.flippable;
        return cell.isElement() && flippable !== null && flippable !== undefined && flippable.includes(axis);
    });

    /** Mirror the shapes that face a way: their directional parts and their stubs (the pipes follow the stub ids). */
    const flip = (axis: FlipAxis) => transaction(() => {
        for (const cell of flipTargets(axis)) {
            const data = dataOfCell(cell);
            const spec = specOf(data?.kind);
            if (!data || !spec || !cell.isElement()) {
                continue;
            }
            const flipped = toggledFlip(data.flip, axis);
            const next: ShapeData = flipped ? { ...data, flip: flipped } : { ...withoutKey(data, 'flip'), kind: data.kind };
            setCell(cell.id, (previous) => ({ ...previous, data: next, portMap: portMapOf(shapePortsOf(spec, next, cell.size())) }));
        }
    }, { name: 'flip' });

    /** A half of the link: a new connection of its kind, data, layer, order and group, with ends and vertices of its own. */
    const halfOf = (link: dia.Link, data: ConnectionData, half: HalfOfLink): LinkRecord<ConnectionData> & { readonly id: string } => {
        const parent = link.parent();
        return withConnectionLook({
            id: crypto.randomUUID(),
            type: 'link',
            source: half.source,
            target: half.target,
            vertices: [...half.vertices],
            layer: layerOfCell(graph, link),
            z: link.z(),
            data: half.tag === undefined ? data : { ...data, tag: half.tag },
            ...(parent ? { parent } : {}),
        });
    };

    /** The link split at the point of its route nearest to the point (on the grid): the halves, the direction there. */
    const splitAt = (link: dia.Link, point: Point) => {
        const linkView = paper?.findViewByModel(link);
        if (!(linkView instanceof dia.LinkView)) {
            return null;
        }
        const length = linkView.getClosestPointLength(point);
        const split = linkView.getPointAtLength(length).snapToGrid(GRID_SIZE).toJSON();
        const tangent = linkView.getTangentAtLength(length);
        const direction = tangent ? { x: tangent.end.x - tangent.start.x, y: tangent.end.y - tangent.start.y } : { x: 1, y: 0 };
        const vertices = link.vertices();
        const isBefore = (vertex: Point) => linkView.getClosestPointLength(vertex) < length;
        return { split, direction, vertices, isBefore };
    };

    /** The ID of the second half of a link with an ID (a conveyor): the next free one of its series (an ID is one cell's). */
    const secondTagOf = (data: ConnectionData): string | undefined => (data.tag ? nextTag(seriesOf(data.tag) ?? 'ID', tagsOf(graph)) : undefined);

    /** Split the link at the point into two with free ends there; the first one selected. */
    const splitLink = (linkId: CellId, point: Point) => {
        const link = graph.getCell(linkId);
        const data: unknown = link?.get('data');
        if (!link?.isLink() || !isConnectionData(data)) {
            return;
        }
        const at = splitAt(link, point);
        if (!at) {
            return;
        }
        const first = halfOf(link, data, { source: link.source(), target: at.split, vertices: at.vertices.filter(at.isBefore) });
        const second = halfOf(link, data, { source: at.split, target: link.target(), vertices: at.vertices.filter((vertex) => !at.isBefore(vertex)), tag: secondTagOf(data) });
        // Not selected while it is replaced: the handles of the selection would hold a cell that is gone.
        selectCells([]);
        transaction(() => {
            setCell(first);
            setCell(second);
            removeCells([linkId]);
        }, { name: 'split-link' });
        selectCells([first.id]);
    };

    /** Insert a join into the pipe at the point: both halves connected to it, each to the side it comes from. */
    const insertJoin = (linkId: CellId, point: Point) => {
        const link = graph.getCell(linkId);
        const data: unknown = link?.get('data');
        const joinSpec = specOf('Join');
        if (!link?.isLink() || !isConnectionData(data) || !joinSpec) {
            return;
        }
        const at = splitAt(link, point);
        if (!at) {
            return;
        }
        const joinId = crypto.randomUUID();
        const parent = link.parent();
        // In the group the pipe is in.
        const join = {
            ...createShape(joinSpec, { id: joinId, position: { x: at.split.x - joinSpec.size.width / 2, y: at.split.y - joinSpec.size.height / 2 } }),
            ...(parent ? { parent } : {}),
        };
        const end = (side: string): LinkEnd => ({ id: joinId, anchor: { name: side, args: { useModelGeometry: true, rotate: true } }, connectionPoint: { name: 'anchor' } });
        const back = sideOfDirection({ x: -at.direction.x, y: -at.direction.y });
        const first = halfOf(link, data, { source: link.source(), target: end(back), vertices: at.vertices.filter(at.isBefore) });
        const second = halfOf(link, data, { source: end(sideOfDirection(at.direction)), target: link.target(), vertices: at.vertices.filter((vertex) => !at.isBefore(vertex)), tag: secondTagOf(data) });
        selectCells([]);
        transaction(() => {
            setCell(join);
            setCell(first);
            setCell(second);
            removeCells([linkId]);
        }, { name: 'insert-join' });
        selectCells([joinId]);
    };

    /** The ends of the links attached to the selected elements (and their members). */
    const connectedEnds = (): Array<readonly [dia.Link, 'source' | 'target']> => {
        const elements = selected().filter((cell): cell is dia.Element => cell.isElement());
        const ids = new Set(elements.flatMap((element) => [element, ...element.getEmbeddedCells({ deep: true })]).map((cell) => cell.id));
        const links = new Set(elements.flatMap((element) => graph.getConnectedLinks(element, { deep: true })));
        return [...links].flatMap((link) => (['source', 'target'] as const)
            .filter((end) => {
                const id = link.get(end)?.id;
                return id !== undefined && ids.has(id);
            })
            .map((end) => [link, end] as const));
    };

    /** The selected elements disconnected: their links' ends left where they are drawn, the elements moved off them. */
    const disconnect = () => {
        const ends = connectedEnds();
        if (ends.length === 0 || !paper) {
            return;
        }
        transaction(() => {
            for (const [link, end] of ends) {
                const view = paper.findViewByModel(link);
                const point = view instanceof dia.LinkView ? (end === 'source' ? view.sourcePoint : view.targetPoint) : link.getSourcePoint();
                setCell(link.id, (previous) => ({ ...previous, [end]: { x: point.x, y: point.y } }));
            }
            for (const cell of selected()) {
                if (cell.isElement() && !cell.getAncestors().some((group) => collection.has(group))) {
                    const { x, y } = cell.position();
                    setCell(cell.id, (previous) => ({ ...previous, position: { x: x + DISCONNECT_SHIFT, y: y + DISCONNECT_SHIFT } }));
                }
            }
        }, { name: 'disconnect' });
    };

    /** The selected cells to the front or the back of their layers, in their order over each other (no transaction of its own). */
    const orderSelected = (toFront: boolean) => {
        const cells = selected().sort((a, b) => (toFront ? a.z() - b.z() : b.z() - a.z()));
        for (const cell of cells) {
            if (toFront) {
                cell.toFront();
            } else {
                cell.toBack();
            }
        }
    };

    /** To the front or the back of their layers, in their order over each other. */
    const order = (toFront: boolean) => transaction(() => orderSelected(toFront), { name: toFront ? 'to-front' : 'to-back' });

    /** Moved into the layer: over what is there going up, under it going down. One step of the history. */
    const moveToLayer = (layer: Layer, isUp: boolean) => transaction(() => {
        for (const id of selectedIds()) {
            setCell(id, (previous) => ({ ...previous, layer }));
        }
        orderSelected(isUp);
    }, { name: 'to-layer' });

    /** Locked: the pointer goes through, nothing connects, not selected. */
    const lock = () => {
        const elements = selected().filter((cell) => cell.isElement());
        selectCells([]);
        transaction(() => {
            for (const element of elements) {
                setCellData(element.id, (previous) => ({ ...previous, locked: true }));
            }
        }, { name: 'lock' });
    };

    const unlock = (ids: readonly CellId[]) => {
        transaction(() => {
            for (const id of ids) {
                setCellData(id, (previous) => ({ ...previous, locked: false }));
            }
        }, { name: 'unlock' });
        selectCells([...ids]);
    };

    /** The selected elements that can be grouped: not the screen, the siblings of the first one (one level). */
    const groupable = () => {
        const elements = selected().filter((cell) => cell.isElement() && dataOfCell(cell)?.kind !== 'Screen');
        const level = elements.length > 0 ? parentIdOf(elements[0]) : null;
        return elements.filter((element) => parentIdOf(element) === level);
    };

    /**
     * The selected elements (2 at least) into a new group with the links between them, fitted around them and
     * selected; in the group they were in (a selected group nests in the new one). One step of the history.
     */
    const group = () => {
        const elements = groupable();
        if (elements.length < 2) {
            return;
        }
        const members = new Set<dia.Cell>(elements.flatMap((element) => [element, ...element.getEmbeddedCells({ deep: true })]));
        const parentId = parentIdOf(elements[0]);
        const links = graph.getLinks().filter((link) => {
            const [source, target] = [link.getSourceCell(), link.getTargetCell()];
            return parentIdOf(link) === parentId && source !== null && target !== null && members.has(source) && members.has(target);
        });
        const id = crypto.randomUUID();
        transaction(() => {
            setCell({ ...createShape(GROUP, { id, tag: nextTag(GROUP.tagPrefix ?? 'GRP', tagsOf(graph)) }), ...(parentId === null ? {} : { parent: parentId }) });
            for (const member of [...elements, ...links]) {
                setCell(member.id, (previous) => ({ ...previous, parent: id }));
            }
            const groupCell = graph.getCell(id);
            if (groupCell?.isElement()) {
                groupCell.fitToChildren({ padding: GROUP_PADDING });
                fitGroupsOf(groupCell, { recorded: true });
            }
        }, { name: 'group' });
        selectCells([id]);
    };

    /** The selected group back into its members (in the group it was in), selected. One step of the history. */
    const ungroup = () => {
        const [groupCell] = selected();
        if (collection.length !== 1 || !isGroupCell(groupCell)) {
            return;
        }
        const members = groupCell.getEmbeddedCells();
        const parentId = parentIdOf(groupCell);
        transaction(() => {
            for (const member of members) {
                setCell(member.id, (previous) => ({ ...previous, parent: parentId ?? undefined }));
            }
            removeCells([groupCell.id]);
        }, { name: 'ungroup' });
        selectCells(members.filter((member) => member.isElement()).map((member) => member.id));
    };

    /**
     * The cells removed (one step of the history): a group they were in fitted to the members left, dissolved when
     * one element (or none) is left - its cells go to the group it is in.
     */
    const removeWithGroups = (cells: readonly dia.Cell[]) => {
        const parents = new Set(cells.flatMap((cell) => cell.getParentCell() ?? []));
        transaction(() => {
            removeCells(cells.map((cell) => cell.id));
            for (const parent of parents) {
                if (!graph.getCell(parent.id) || !parent.isElement()) {
                    continue;
                }
                const rest = parent.getEmbeddedCells();
                if (rest.filter((cell) => cell.isElement()).length > 1) {
                    parent.fitToChildren({ padding: GROUP_PADDING });
                    fitGroupsOf(parent, { recorded: true });
                    continue;
                }
                const upperId = parentIdOf(parent);
                for (const cell of rest) {
                    setCell(cell.id, (previous) => ({ ...previous, parent: upperId ?? undefined }));
                }
                removeCells([parent.id]);
            }
        }, { name: 'remove' });
    };

    /** The pasted cells with IDs of their own (a copy: the next free one of its series), the top ones selected. */
    const selectPasted = (cells: readonly dia.Cell[]) => {
        const pasted = new Set(cells.map((cell) => cell.id));
        const used = new Set(graph.getCells().flatMap((cell) => (pasted.has(cell.id) ? [] : dataOfCell(cell)?.tag ?? [])));
        for (const cell of cells) {
            const data = dataOfCell(cell);
            if (!data?.tag) {
                continue;
            }
            const tag = used.has(data.tag) ? nextTag(seriesOf(data.tag) ?? 'ID', used) : data.tag;
            used.add(tag);
            if (tag !== data.tag) {
                // On the model: the pasted cells reach the store when the step ends.
                cell.set('data', { ...data, tag });
            }
        }
        selectCells(cells.filter((cell) => !cell.isEmbedded()).map((cell) => cell.id));
    };

    /** The selected cells but the screen (a diagram has one): with their members. */
    const copied = () => selected().filter((cell) => dataOfCell(cell)?.kind !== 'Screen').map((cell) => cell.id);

    /** The unlocked element drawn right under the cell at the point. */
    const elementBelow = (cell: dia.Cell, point: Point): dia.Element | undefined => {
        const top = drawOrder(graph, cell);
        return graph.findElementsAtPoint(point)
            .filter((other) => other.id !== cell.id && !isLocked(other) && drawOrder(graph, other) < top)
            .sort((a, b) => drawOrder(graph, b) - drawOrder(graph, a))[0];
    };

    /** All the unlocked cells of the kinds of the selection. */
    const sameType = () => {
        const kinds = new Set(selected().flatMap((cell) => dataOfCell(cell)?.kind ?? []));
        return graph.getCells().filter((cell) => kinds.has(dataOfCell(cell)?.kind ?? '') && !isLocked(cell));
    };

    /** What Select All selects: as a region - not the screen, a group for its members, not a locked cell. */
    const unlocked = () => graph.getCells().filter((cell) => !isLocked(cell) && !cell.isEmbedded() && dataOfCell(cell)?.kind !== 'Screen');

    return {
        flip,
        flipTargets,
        splitLink,
        insertJoin,
        disconnect,
        connectedEnds,
        order,
        moveToLayer,
        lock,
        unlock,
        group,
        ungroup,
        groupable,
        elementBelow,
        sameType,
        selectAll: () => selectCells(unlocked().map((cell) => cell.id)),
        selectElements: () => selectCells(unlocked().filter((cell) => cell.isElement()).map((cell) => cell.id)),
        selectConnections: () => selectCells(unlocked().filter((cell) => cell.isLink()).map((cell) => cell.id)),
        copy: () => copyCells(copied(), CLIPBOARD_OPTIONS),
        cut: () => {
            const ids = copied();
            copyCells(ids, CLIPBOARD_OPTIONS);
            removeWithGroups(ids.flatMap((id) => graph.getCell(id) ?? []));
        },
        paste: () => transaction(() => selectPasted(pasteCells({ ...CLIPBOARD_OPTIONS, translate: PASTE_OFFSET })), { name: 'paste' }),
        pasteAt: (point: Point) => transaction(() => selectPasted(pasteCellsAtPoint(point, CLIPBOARD_OPTIONS)), { name: 'paste' }),
        remove: () => removeWithGroups(selected()),
        removeWithGroups,
        isConnection: (cell: dia.Cell) => isConnectionData(cell.get('data')),
    };
}
