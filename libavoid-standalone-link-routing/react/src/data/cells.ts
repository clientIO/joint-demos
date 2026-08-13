import type { ElementPort, ElementRecord, LinkRecord } from '@joint/react-plus';
import { AWAITING_CLASS } from '@/routing/awaiting';
import { CANVAS_COLOR, DARK_COLOR, LIGHT_COLOR, MAIN_COLOR } from '@/theme';
import example1 from './example-1.json';
import example2 from './example-2.json';

/** Which of the two node shapes an element draws. */
export type NodeKind = 'message' | 'start';

/** The `data` slice `RenderNode` receives. */
export interface NodeData {
    readonly kind: NodeKind;
    readonly label: string;
}

export type NodeElement = ElementRecord<NodeData>;
export type FlowLink = LinkRecord;
export type FlowCell = NodeElement | FlowLink;

export const NODE_SIZE: Record<NodeKind, { readonly width: number; readonly height: number }> = {
    message: { width: 344, height: 80 },
    start: { width: 48, height: 48 },
};

const PORT_SIZE = 14;

/*
 * Two fixed stacking levels: every link below every node.
 *
 * The source JSON carries a per-cell `z` that runs from 2 to 18 on the
 * elements, which is the order they happened to be created in rather than
 * anything meaningful. Carrying it over would let one node paint over another
 * for no reason, and — because a Libavoid route is free to pass straight across
 * a node it does not connect — would put some links on top of the boxes they
 * cross. Collapsing it to one level per kind is all this diagram needs.
 */
const LINK_Z = 1;
const ELEMENT_Z = 2;

/*
 * The two saved graphs are plain JointJS JSON, describing `app.Message` /
 * `app.FlowchartStart` / `app.Link` shape types.
 *
 * There are no shape classes to register here: the nodes are React components,
 * so the JSON is converted below into the plain records `<Diagram>` takes, with
 * everything a shape definition would hold (size, ports, label, link styling)
 * either derived from the node kind or carried on the record.
 */

interface SourcePort {
    readonly id: string;
    readonly group: 'in' | 'out';
}

interface SourceCell {
    readonly id: string;
    readonly type: string;
    readonly position?: { readonly x: number; readonly y: number };
    readonly size?: { readonly width: number; readonly height: number };
    readonly ports?: { readonly items?: readonly SourcePort[] };
    readonly attrs?: { readonly label?: { readonly text?: string }};
    readonly source?: { readonly id: string; readonly port?: string };
    readonly target?: { readonly id: string; readonly port?: string };
    readonly labels?: readonly {
        readonly attrs?: { readonly labelText?: { readonly text?: string }};
        readonly position?: { readonly distance?: number };
    }[];
}

interface SourceGraph {
    readonly cells: readonly SourceCell[];
}

const NODE_KINDS: Record<string, NodeKind> = {
    'app.Message': 'message',
    'app.FlowchartStart': 'start',
};

/**
 * Places one group's ports along an edge, evenly spaced.
 *
 * The `portMap` shorthand positions every port absolutely, so the spacing the
 * native `'top'` / `'bottom'` port group layouts would have computed is done
 * here instead: port `i` of `n` sits at `(i + 1) / (n + 1)` of the edge.
 */
function portOffsets(count: number, width: number, edgeY: number) {
    return Array.from({ length: count }, (_, index) => ({
        cx: (width * (index + 1)) / (count + 1),
        cy: edgeY,
    }));
}

function toPortMap(cell: SourceCell, kind: NodeKind): Record<string, ElementPort> {
    const items = cell.ports?.items ?? [];
    const { width, height } = NODE_SIZE[kind];
    const inPorts = items.filter((port) => port.group === 'in');
    const outPorts = items.filter((port) => port.group === 'out');

    const portMap: Record<string, ElementPort> = {};
    const place = (ports: readonly SourcePort[], edgeY: number, color: string) => {
        portOffsets(ports.length, width, edgeY).forEach((offset, index) => {
            portMap[ports[index].id] = {
                ...offset,
                width: PORT_SIZE,
                height: PORT_SIZE,
                color,
                outline: LIGHT_COLOR,
                outlineWidth: 2,
                // An `in` port is a drop target only: a new link is dragged out
                // of an `out` port and onto an `in` one, never the reverse.
                passive: edgeY === 0,
            };
        });
    };

    place(inPorts, 0, MAIN_COLOR);
    // The start node's single outlet is drawn in the dark accent so the entry
    // point of the flow reads differently from every downstream connection.
    place(outPorts, height, kind === 'start' ? DARK_COLOR : MAIN_COLOR);
    return portMap;
}

export interface NodeSpec {
    readonly id: string;
    readonly kind: NodeKind;
    readonly label: string;
    readonly position: { readonly x: number; readonly y: number };
    /** Omit for a node with no ports; links then attach to its centre. */
    readonly portMap?: Record<string, ElementPort>;
}

/**
 * Builds one node record.
 *
 * The size is written onto the model from {@link NODE_SIZE} rather than measured
 * back out of the DOM. `useMeasureElement` would make every node report its box
 * through a `ResizeObserver` before the first route could be computed — 750
 * round trips on the generated graph — and these shapes are a fixed size per
 * kind, so there is nothing to find out. Everything downstream that needs the
 * geometry reads it from the model: the fit (`useModelGeometry`), the quad-tree
 * spatial index, and virtual rendering's viewport test.
 */
export function makeNode({ id, kind, label, position, portMap }: NodeSpec): NodeElement {
    return {
        id,
        type: 'element',
        z: ELEMENT_Z,
        position,
        size: NODE_SIZE[kind],
        data: { kind, label },
        ...(portMap ? { portMap } : {}),
    };
}

export interface LinkSpec {
    readonly id: string;
    readonly source: { readonly id: string; readonly port?: string };
    readonly target: { readonly id: string; readonly port?: string };
    readonly label?: string;
    /** Where the label sits along the path, 0–1. */
    readonly labelPosition?: number;
}

/** Builds one link record, awaiting its route. */
export function makeLink({ id, source, target, label, labelPosition }: LinkSpec): FlowLink {
    return {
        id,
        type: 'link',
        z: LINK_Z,
        source,
        target,
        style: {
            color: DARK_COLOR,
            width: 1.5,
            targetMarker: 'arrow',
            // Every link starts out unrouted — the worker has not answered yet.
            className: AWAITING_CLASS,
        },
        labelMap: label
            ? {
                name: {
                    text: label,
                    position: labelPosition ?? 0.5,
                    color: DARK_COLOR,
                    fontSize: 12,
                    backgroundColor: CANVAS_COLOR,
                    backgroundOutline: CANVAS_COLOR,
                    backgroundOutlineWidth: 2,
                },
            }
            : undefined,
    };
}

/** Converts one of the saved JointJS graphs into cell records. */
export function fromJointJSON(graph: SourceGraph): readonly FlowCell[] {
    return graph.cells.map((cell) => {
        const kind = NODE_KINDS[cell.type];
        if (!kind) {
            const [label] = cell.labels ?? [];
            return makeLink({
                id: cell.id,
                source: cell.source ?? { id: '' },
                target: cell.target ?? { id: '' },
                label: label?.attrs?.labelText?.text,
                labelPosition: label?.position?.distance,
            });
        }
        return makeNode({
            id: cell.id,
            kind,
            label: cell.attrs?.label?.text ?? '',
            position: cell.position ?? { x: 0, y: 0 },
            portMap: toPortMap(cell, kind),
        });
    });
}

export const SAVED_GRAPHS = {
    small: () => fromJointJSON(example1 as SourceGraph),
    large: () => fromJointJSON(example2 as SourceGraph),
};
