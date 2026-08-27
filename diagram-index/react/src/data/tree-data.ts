import type { ElementRecord, LinkRecord, LinkLabel, LinkStyle } from '@joint/react-plus';
import { CANVAS_COLOR, INK_COLOR, LINK_COLOR } from '@/theme';

/**
 * The saved diagrams, kept directly as the cell records `<Diagram>` renders —
 * the demo's stand-in for diagrams loaded from a backend.
 */

/** Which flowchart outline a node draws. */
export type NodeKind = 'rectangle' | 'parallelogram' | 'diamond' | 'ellipse';

/** The `data` slice `RenderNode` receives. */
export interface NodeData {
    readonly kind: NodeKind;
    readonly label: string;
    /** Corner radius — only the rounded `Start` rectangle carries one. */
    readonly rx?: number;
}

export type IndexElement = ElementRecord<NodeData>;
export type IndexLink = LinkRecord;
export type IndexCell = IndexElement | IndexLink;

export interface SourceDiagram {
    readonly id: string;
    readonly name: string;
    readonly cells: readonly IndexCell[];
}

/*
 * Two fixed stacking levels — every link (z 1) below every element (z 2).
 */
const LINK_Z = 1;
const ELEMENT_Z = 2;

/** The one style every link draws with. */
const LINK_STYLE: LinkStyle = {
    color: LINK_COLOR,
    width: 1.5,
    targetMarker: 'arrow',
};

/** A link label on a quiet pill, so the line doesn't strike the text through. */
function label(text: string): LinkLabel {
    return {
        text,
        color: INK_COLOR,
        fontSize: 12,
        backgroundColor: CANVAS_COLOR,
        backgroundOutline: CANVAS_COLOR,
        backgroundOutlineWidth: 2,
    };
}

export const TreeData: readonly SourceDiagram[] = [{
    id: 'process0',
    name: 'Process 1',
    cells: [{
        id: 'r3',
        type: 'element',
        z: ELEMENT_Z,
        position: { x: 200, y: 80 },
        size: { width: 100, height: 60 },
        data: { kind: 'rectangle', label: 'Start', rx: 20 },
    }, {
        id: 'p2',
        type: 'element',
        z: ELEMENT_Z,
        position: { x: 200, y: 230 },
        size: { width: 100, height: 60 },
        data: { kind: 'parallelogram', label: 'Input' },
    }, {
        id: 'p1',
        type: 'element',
        z: ELEMENT_Z,
        position: { x: 200, y: 400 },
        size: { width: 100, height: 100 },
        data: { kind: 'diamond', label: 'Decision' },
    }, {
        id: 'r4',
        type: 'element',
        z: ELEMENT_Z,
        position: { x: 200, y: 600 },
        size: { width: 100, height: 60 },
        data: { kind: 'rectangle', label: 'Process' },
    }, {
        id: 'e1',
        type: 'element',
        z: ELEMENT_Z,
        position: { x: 220, y: 750 },
        size: { width: 60, height: 60 },
        data: { kind: 'ellipse', label: 'End' },
    }, {
        id: 'l1',
        type: 'link',
        z: LINK_Z,
        source: { id: 'r3' },
        target: { id: 'p2' },
        style: LINK_STYLE,
    }, {
        id: 'l2',
        type: 'link',
        z: LINK_Z,
        source: { id: 'p2' },
        target: { id: 'p1' },
        style: LINK_STYLE,
    }, {
        id: 'l3',
        type: 'link',
        z: LINK_Z,
        source: { id: 'p1' },
        target: { id: 'r4' },
        style: LINK_STYLE,
        labelMap: { text: label('Yes') },
    }, {
        id: 'l4',
        type: 'link',
        z: LINK_Z,
        source: { id: 'p1' },
        target: { id: 'p2' },
        vertices: [{ x: 400, y: 450 }, { x: 400, y: 260 }],
        style: LINK_STYLE,
        labelMap: { text: label('No') },
    }, {
        id: 'l5',
        type: 'link',
        z: LINK_Z,
        source: { id: 'r4' },
        target: { id: 'e1' },
        style: LINK_STYLE,
    }],
}, {
    id: 'process1',
    name: 'Process 2',
    cells: [{
        id: 'r1',
        type: 'element',
        z: ELEMENT_Z,
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
        data: { kind: 'rectangle', label: 'Source' },
    }, {
        id: 'r2',
        type: 'element',
        z: ELEMENT_Z,
        position: { x: 300, y: 100 },
        size: { width: 100, height: 100 },
        data: { kind: 'rectangle', label: 'Target' },
    }, {
        // The two parallel links: `center` anchors shifted ±10 px keep them apart.
        id: 'l6',
        type: 'link',
        z: LINK_Z,
        source: { id: 'r1', anchor: { name: 'center', args: { dy: -10 }}},
        target: { id: 'r2', anchor: { name: 'center', args: { dy: -10 }}},
        style: LINK_STYLE,
    }, {
        id: 'l7',
        type: 'link',
        z: LINK_Z,
        source: { id: 'r1', anchor: { name: 'center', args: { dy: 10 }}},
        target: { id: 'r2', anchor: { name: 'center', args: { dy: 10 }}},
        style: LINK_STYLE,
    }],
}];
