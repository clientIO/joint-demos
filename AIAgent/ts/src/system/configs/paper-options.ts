import type { g, anchors, connectionStrategies } from '@joint/plus';
import { dia, connectors } from '@joint/plus';
import { Attribute } from '../diagram/const';
import { SystemButton } from '../diagram/models';

const LINK_SOURCE_ANCHOR_OFFSET = 25;
const LINK_TARGET_ANCHOR_OFFSET = 20;
const LINK_SOURCE_CONNECTOR_OFFSET = 25;
const LINK_TARGET_CONNECTOR_OFFSET = 20;

export const magnetThreshold = 'onleave';
export const clickThreshold = 10;
export const moveThreshold = 5;
export const labelsLayer = true;
export const snapLinks = true;
export const markAvailable = true;
export const linkPinning = false;


export const allowLink = (linkView: dia.LinkView) => {
    const link = linkView.model;
    const target = link.getTargetElement();
    const source = link.getSourceElement();
    if (!source || !target) return false;
    // Forbid immediate parent-child connections
    if (source === target) return false;
    return !SystemButton.isButton(target);
};

export const validateConnection = (cellViewS: dia.CellView, _magnetS: SVGElement, cellViewT: dia.CellView) => {

    const source = cellViewS.model;
    const target = cellViewT.model;
    const graph = cellViewS.model.graph;

    if (source.isLink() || target.isLink()) return false;

    // Forbid element loops
    if (source === target) return false;

    const links = graph.getConnectedLinks(source, { outbound: true });
    // Forbid connections to elements that are already connected
    if (links.some(link => link.getTargetCell() === target)) return false;

    return (
        !SystemButton.isButton(target) &&
        !target.get(Attribute.CustomPosition) &&
        !target.get(Attribute.SourceOnly)
    );
};

// Disable the built-in highlighting effects
export const highlighting = {
    [dia.CellView.Highlighting.CONNECTING]: false,
    [dia.CellView.Highlighting.ELEMENT_AVAILABILITY]: false,
};

export const connectionStrategy: connectionStrategies.ConnectionStrategy = (end, endView, _endMagnet, _coords, _link, endType) => {

    const graph = endView.model.graph;

    end.connectionPoint = {
        name: 'anchor',
    };

    if (endType === 'target') {
        end.anchor = {
            name: 'midSide',
            args: {
                useModelGeometry: true,
                padding: LINK_TARGET_ANCHOR_OFFSET,
                mode: 'horizontal'
            }
        };
        return end;
    }

    // endType === 'source'

    end.anchor = {
        name: 'bottom',
        args: {
            useModelGeometry: true,
            dy: LINK_SOURCE_ANCHOR_OFFSET,
        }
    };

    const button = graph.getCell(end.id as dia.Cell.ID);
    const [el] = graph.getNeighbors(button as dia.Element, { inbound: true });
    if (el) {
        // Reconnect the link dragged from the button to the parent element
        end.id = el.id;
    }

    return end;
};

export const defaultConnector: connectors.Connector = (sourcePoint: g.Point, targetPoint: g.Point, routePoints: g.Point[], _: never, linkView: dia.LinkView) => {
    const link = linkView.model;
    const opt: connectors.StraightConnectorArguments = {
        cornerType: 'cubic',
        cornerRadius: 10,
    };

    const midPoints = [sourcePoint, ...routePoints];

    const sourceTipPoint = sourcePoint.clone();
    const linkSourceCell = link.getSourceCell();
    if (linkSourceCell) {
        sourceTipPoint.move(linkSourceCell.getCenter(), -LINK_SOURCE_CONNECTOR_OFFSET);
    }

    const targetTipPoint = targetPoint.clone();
    const linkTargetCell = link.getTargetCell();
    if (linkTargetCell) {
        // Don't move the target point if the link is being dragged
        // (i.e. the target is not an element)
        targetTipPoint.move(linkTargetCell.getCenter(), -LINK_TARGET_CONNECTOR_OFFSET);
        midPoints.push(targetPoint);
    }

    return connectors.straight(sourceTipPoint, targetTipPoint, midPoints, opt);
};

export const defaultAnchor: anchors.AnchorJSON = {
    name: 'midSide',
    args: {
        useModelGeometry: true,
        mode: 'vertical',
        padding: LINK_SOURCE_ANCHOR_OFFSET,
    }
};

export const interactive: dia.Paper.Options['interactive'] = (cellView: dia.CellView) => {
    const cell = cellView.model;
    return {
        addLinkFromMagnet: true,
        elementMove: Boolean(cell.get(Attribute.CustomPosition)),
        linkMove: false,
        labelMove: false
    };
};
