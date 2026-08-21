import { dia, shapes } from '@joint/plus';
import { ShapeTypes, type AppElement, type AppShape } from '../shapes/shapes-typing';
import { BPMNLinkView } from '../shapes/placeholder/placeholder-shapes';
import { LabelElementView } from '../shapes/shape-view';
import { canElementExistOutsidePool, getBoundaryPoint, getSwimlaneParent } from '../utils';
import { MAIN_COLOR } from '../configs/theme';
import { graph } from './core';

import type { CanConnectOptions, ConnectionStrategy, InteractionsOptions, ValidateEmbedding, ValidateUnembedding } from '@joint/react-plus';

// The highlighting config is passed via the dedicated `<Paper highlighting>` prop.
export const HIGHLIGHTING: dia.Paper.Options['highlighting'] = {
    [dia.CellView.Highlighting.CONNECTING]: {
        name: 'stroke',
        options: {
            padding: 0,
            attrs: {
                stroke: MAIN_COLOR,
                strokeWidth: 3
            }
        }
    },
    // Handled separately in ViewController
    [dia.CellView.Highlighting.EMBEDDING]: false
};

// Native `dia.Paper` options passed through the `<Paper options>` escape
// hatch (raw JointJS signatures).
// Passed via the dedicated `<Paper interactive>` prop — the react Paper calls
// `paper.setInteractivity()` with this value on every update, which would
// clobber an `interactive` set through the `options` escape hatch.
export const bpmnInteractivity = ({ model }: { model: dia.Cell }): dia.CellView.InteractivityOptions => {
    // Prevent swimlane move to pool/show ghost
    const isSwimlane = shapes.bpmn2.Swimlane.isSwimlane(model);

    let stopDelegation = true;

    if (isSwimlane) {
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
    keyboard: false,
    clipboard: false,
    commandManager: false,
    // When the region gesture starts on a swimlane, select only elements
    // inside that swimlane, excluding everything else.
    selectionRegion: ({ event, paper }) => {
        const view = paper.findView(event.target as HTMLElement);
        const origin = view?.model;

        if (!origin || !shapes.bpmn2.Swimlane.isSwimlane(origin)) return {};

        return {
            filter: ({ model }: { model: dia.Cell }) => {
                // Never select pools or swimlanes if the region started on a pool or swimlane
                if (shapes.bpmn2.CompositePool.isPool(model) ||
                    shapes.bpmn2.Swimlane.isSwimlane(model)) return false;

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
    validate: ({ source, target }) => (source.model as AppShape).validateConnection(target.model)
};

// Converts the drop coordinates into a fixed anchor: a boundary point for
// elements, the closest point along the line for links.
export const bpmnConnectionStrategy: ConnectionStrategy = ({ end, model, dropPoint, paper }) => {

    if (model.isElement()) {
        const { x, y } = getBoundaryPoint(model as AppElement, dropPoint);

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

export const bpmnValidateEmbedding: ValidateEmbedding = ({ child, parent, paper }) => {
    return (child.model as AppElement).validateEmbedding(parent.model, paper.model === graph);
};

export const bpmnValidateUnembedding: ValidateUnembedding = ({ child }) => {
    const isPoolPresent = graph.getElements().some(element => element.get('shapeType') === ShapeTypes.POOL);

    const element = child.model as AppElement;

    // If there is a pool present, only allow unembedding of elements that are valid outside of pools
    if (isPoolPresent && !canElementExistOutsidePool(element) && !shapes.bpmn2.Swimlane.isSwimlane(element)) return false;

    return !(element.validateUnembedding) || element.validateUnembedding();
};

// Options without a react counterpart, passed through the `<Paper options>`
// escape hatch (raw JointJS signatures).
export const PAPER_NATIVE_OPTIONS: Partial<dia.Paper.Options> = {
    findParentBy: (elementView: dia.ElementView, evt: dia.Event) => {
        const parentView = elementView.getTargetParentView(evt);
        // Enable easier snapping for boundary elements by bbox
        const useBBox = !parentView || (parentView && !shapes.bpmn2.Swimlane.isSwimlane(parentView.model));
        const searchBy = useBBox ? 'bbox' : 'center';

        return graph.findElementsUnderElement(elementView.model, { searchBy });
    },
    // Anchor links to the middle of the element side nearest the other end.
    defaultAnchor: { name: 'midSide', args: { useModelGeometry: true }},
    elementView: LabelElementView,
    linkView: BPMNLinkView,
    allowLink: ({ model }) => {
        // Link has source and target elements
        return !!(model.source().id) && !!(model.target().id);
    }
};
