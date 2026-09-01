import type { shapes } from '@joint/plus';
import { dia } from '@joint/plus';
import { type BpmnElement, type BpmnShape } from '../shapes/shapes-typing';
import { BpmnLinkView } from '../shapes/link-view';
import { LabelElementView } from '../shapes/shape-view';
import { IntermediateBoundary } from '../shapes/event/event-shapes';
import { canElementExistOutsidePool, getClosestElementBoundaryPoint, getSwimlaneParent, isSwimlane, isPool } from '../utils';

import type { CanConnectOptions, ConnectionStrategy, InteractionsOptions, SnaplinesCanSnap, ValidateEmbedding } from '@joint/react-plus';

// The paper zoom bounds: used by the paper scroller, the keyboard zoom
// shortcuts, the fit-to-screen action and the zoom slider.
export const ZOOM_SETTINGS = {
    min: 0.2,
    max: 2
};

// The highlighting config is passed via the dedicated `<Paper highlighting>` prop.
export const HIGHLIGHTING: dia.Paper.Options['highlighting'] = {
    [dia.CellView.Highlighting.CONNECTING]: {
        name: 'stroke',
        options: {
            padding: 0,
            attrs: {
                stroke: 'var(--bpmn-selector)',
                strokeWidth: 3
            }
        }
    },
    // The `highlighting` option replaces the react paper's defaults, so the
    // magnet availability highlighters (`markAvailable`) must be declared
    // here too — see `effects.css` for their styling.
    [dia.CellView.Highlighting.MAGNET_AVAILABILITY]: {
        name: 'addClass',
        options: {
            className: 'available-magnet'
        }
    },
    [dia.CellView.Highlighting.ELEMENT_AVAILABILITY]: {
        name: 'addClass',
        options: {
            className: 'available-cell'
        }
    },
    // Embedding highlights are handled by the view interactions (effects).
    [dia.CellView.Highlighting.EMBEDDING]: false
};

// Native `dia.Paper` options passed through the `<Paper options>` escape
// hatch (raw JointJS signatures).
// Passed via the dedicated `<Paper interactive>` prop — the react Paper calls
// `paper.setInteractivity()` with this value on every update, which would
// clobber an `interactive` set through the `options` escape hatch.
export const bpmnInteractivity = ({ model }: { model: dia.Cell }): dia.CellView.InteractivityOptions => {
    // Prevent swimlane move to pool/show ghost
    const isLane = isSwimlane(model);

    let stopDelegation = true;

    if (isLane) {
        const pool = model.getParentCell() as shapes.bpmn2.CompositePool;
        stopDelegation = pool.getSwimlanes().length > 1;
    }

    return {
        stopDelegation,
        labelMove: false
    };
};

// Built-in <Diagram> interactions: wheel panning, pinch/ctrl-wheel zoom, pan
// cursor, click-to-select and the shift-drag region. The generic keyboard,
// clipboard and history shortcuts are off — the app binds its own
// (BPMN-specific swimlane-aware delete, zoom clamping, undo/redo).
export const DIAGRAM_INTERACTIONS: InteractionsOptions = {
    // The built-in shortcuts are all-or-nothing (its `delete` is not
    // swimlane-aware) — the app binds its own in `<KeyboardShortcuts>`.
    keyboard: false,
    // When the region gesture starts on a swimlane, select only elements
    // inside that swimlane, excluding everything else.
    selectionRegion: ({ event, paper }) => {
        const view = paper.findView(event.target as HTMLElement);
        const origin = view?.model;

        // Blank area and elements: default region. Swimlanes: rubber-band
        // scoped to the lane's own elements.
        if (!origin || !isSwimlane(origin)) return {};

        return {
            filter: ({ model }: { model: dia.Cell }) => {
                // Never select pools or swimlanes if the region started on a pool or swimlane
                if (isPool(model) ||
                    isSwimlane(model)) return false;

                const parent = getSwimlaneParent(model);
                // Cell is not part of any pool
                if (!parent) return false;
                return parent.id === origin.id;
            }
        };
    }
};

// Connection validation is delegated entirely to the shape classes — the
// built-in rules are switched off so they don't get in the way (e.g.
// annotation links may attach to other links).
export const bpmnValidateConnection: CanConnectOptions = {
    allowSelfLoops: true,
    allowLinkToLink: true,
    linkLimit: 'none',
    allowRootConnection: true,
    validate: ({ source, target }) => (source.model as BpmnShape).validateConnection(target.model)
};

// Converts the drop coordinates into a fixed anchor: a boundary point for
// elements, the closest point along the line for links.
export const bpmnConnectionStrategy: ConnectionStrategy = ({ end, model, dropPoint, paper }) => {

    if (model.isElement()) {
        const { x, y } = getClosestElementBoundaryPoint(model as BpmnElement, dropPoint);

        end.anchor = {
            name: 'topLeft',
            args: {
                dx: x,
                dy: y
            }
        };
    } else {
        const linkView = paper.findViewByModel(model) as dia.LinkView;

        end.anchor = {
            name: 'connectionLength',
            args: {
                length: linkView.getClosestPointLength(dropPoint)
            }
        };
    }

    return end;
};

// Do not snap pools, swimlanes and boundary events
export const bpmnCanSnap: SnaplinesCanSnap = ({ model }) => {
    return (
        !isSwimlane(model) &&
        !isPool(model) &&
        !(model instanceof IntermediateBoundary)
    );
};

export const bpmnValidateEmbedding: ValidateEmbedding = ({ child, parent, graph }) => {
    // `graph` is the child view's graph: during a stencil drag it is the drag
    // paper's graph, so comparing it with the parent's graph tells whether the
    // child is already part of the diagram.
    const inGraph = graph === parent.model.graph;
    return (child.model as BpmnElement).validateEmbedding(parent.model, inGraph);
};

// Options without a react counterpart, passed through the `<Paper options>`
// escape hatch (raw JointJS signatures).
export const PAPER_NATIVE_OPTIONS: Partial<dia.Paper.Options> = {
    // Passed as a native option, not the `validateUnembedding` prop: the
    // react wrapper reads the graph from the element view's paper, which
    // during a stencil drop is the drag paper — the pool check must run
    // against the diagram graph (`this` is always the drop-target paper).
    validateUnembedding: function(this: dia.Paper, elementView: dia.ElementView) {
        const isPoolPresent = this.model.getElements().some(isPool);

        const element = elementView.model as BpmnElement;

        // If there is a pool present, only allow unembedding of elements that are valid outside of pools
        if (isPoolPresent && !canElementExistOutsidePool(element) && !isSwimlane(element)) return false;

        return !(element.validateUnembedding) || element.validateUnembedding();
    },
    // Called by the paper with the paper's graph as `this`.
    findParentBy: function(this: dia.Graph, elementView: dia.ElementView, evt: dia.Event) {
        const parentView = elementView.getTargetParentView(evt);
        // Enable easier snapping for boundary elements by bbox
        const useBBox = !parentView || (parentView && !isSwimlane(parentView.model));
        const searchBy = useBBox ? 'bbox' : 'center';

        return this.findElementsUnderElement(elementView.model, { searchBy });
    },
    // Anchor links to the middle of the element side nearest the other end.
    defaultAnchor: { name: 'midSide', args: { useModelGeometry: true }},
    elementView: LabelElementView,
    linkView: BpmnLinkView,
    allowLink: ({ model }) => {
        // Link has source and target elements
        return !!(model.source().id) && !!(model.target().id);
    }
};
