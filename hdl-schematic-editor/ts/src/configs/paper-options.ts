/**
 * @file options for the Paper component
 * @see https://docs.jointjs.com/api/dia/Paper#options
 */
import { shapes, dia } from '@joint/plus';
import { validateConnection as validateSystemConnection } from '../system/configs/paper-options';

import Theme from '../diagram/theme';

export const gridSize: dia.Paper.Options['gridSize'] = Theme.GridSize;

export const drawGrid: dia.Paper.Options['drawGrid'] = {
    name: 'dot',
    args: { color: Theme.GridColor, thickness: 1 }
};

export const background: dia.Paper.Options['background'] = {
    color: Theme.PaperColor
};

export const async: dia.Paper.Options['async'] = true;

export const preventDefaultBlankAction: dia.Paper.Options['preventDefaultBlankAction'] = false;

/**
 * A temporary link used only during interactive link creation.
 * (e.g., when dragging from a magnet or starting a connection from a menu)
 * It exists only for the duration of the interaction and is later replaced
 * by the actual link created by the application logic.
 */
export const defaultLink: dia.Paper.Options['defaultLink'] = () => new shapes.standard.Link({
    attrs: {
        line: {
            stroke: Theme.WirePreviewColor,
            strokeWidth: Theme.WireWidth,
            strokeDasharray: '4 2',
            targetMarker: null
        },
    }
});

/**
 * Wires are drawn as straight segments between the vertices computed by the layout.
 */
export const defaultConnector: dia.Paper.Options['defaultConnector'] = {
    name: 'normal'
};

/**
 * Wires connect to the pin ends. The ports have zero size and are positioned
 * at the pin ends, so the model geometry is used (not the rendered pin and its name).
 */
export const defaultAnchor: dia.Paper.Options['defaultAnchor'] = {
    name: 'center',
    args: { useModelGeometry: true }
};

export const defaultConnectionPoint: dia.Paper.Options['defaultConnectionPoint'] = {
    name: 'anchor'
};

export const snapLinks: dia.Paper.Options['snapLinks'] = {
    radius: 20
};

/**
 * In addition to the system rules, an input port can be driven by a single output port only.
 */
export const validateConnection: dia.Paper.Options['validateConnection'] = function(this: dia.Paper, cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
    if (!validateSystemConnection!.call(this, cellViewS, magnetS, cellViewT, magnetT, end, linkView)) return false;
    const targetPortId = cellViewT.findAttribute('port', magnetT);
    if (!targetPortId) return false;
    const target = cellViewT.model;
    const graph = target.graph;
    const isDriven = graph.getConnectedLinks(target, { inbound: true }).some(link => {
        return link !== linkView.model && link.target().port === targetPortId;
    });
    return !isDriven;
};

/**
 * The nodes can be moved freely (the wires are rerouted by the avoid router).
 */
export const interactive: dia.Paper.Options['interactive'] = {
    elementMove: true,
    addLinkFromMagnet: true,
    linkMove: false,
    labelMove: false,
};

// Disable the built-in highlighting effects
export const highlighting = {
    [dia.CellView.Highlighting.CONNECTING]: false,
    [dia.CellView.Highlighting.ELEMENT_AVAILABILITY]: false,
    [dia.CellView.Highlighting.MAGNET_AVAILABILITY]: false,
};
