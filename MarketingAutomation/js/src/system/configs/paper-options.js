import { dia } from '@joint/plus';
import { Attribute } from '../diagram/const';
import { SystemButton } from '../diagram/models';
import cubicConnector from '../../features/cubic-connector';

export const magnetThreshold = 'onleave';
export const clickThreshold = 10;
export const moveThreshold = 5;
export const labelsLayer = true;
export const snapLinks = true;
export const markAvailable = true;
export const linkPinning = false;

export const allowLink = (linkView) => {
    const link = linkView.model;
    const target = link.getTargetElement();
    const source = link.getSourceElement();
    if (!source || !target)
        return false;
    // Forbid immediate parent-child connections
    if (source === target)
        return false;
    return !SystemButton.isButton(target);
};

export const validateConnection = (cellViewS, _magnetS, cellViewT) => {
    
    const source = cellViewS.model;
    const target = cellViewT.model;
    const graph = cellViewS.model.graph;
    
    if (source.isLink() || target.isLink())
        return false;
    
    // Forbid element loops
    if (source === target)
        return false;
    
    const links = graph.getConnectedLinks(source, { outbound: true });
    // Forbid connections to elements that are already connected
    if (links.some(link => link.getTargetCell() === target))
        return false;
    
    return (!SystemButton.isButton(target) &&
        !target.get(Attribute.CustomPosition) &&
        !target.get(Attribute.SourceOnly));
};

// Disable the built-in highlighting effects
export const highlighting = {
    [dia.CellView.Highlighting.CONNECTING]: false,
    [dia.CellView.Highlighting.ELEMENT_AVAILABILITY]: false,
};

export const connectionStrategy = (end, endView, _endMagnet, _coords, _link, endType) => {
    
    const graph = endView.model.graph;
    
    end.connectionPoint = {
        name: 'anchor'
    };
    
    if (endType === 'target') {
        end.anchor = {
            name: 'midSide',
            args: {
                mode: 'horizontal'
            }
        };
        return end;
    }
    
    // endType === 'source'
    
    end.anchor = {
        name: 'bottom'
    };
    
    const button = graph.getCell(end.id);
    const [el] = graph.getNeighbors(button, { inbound: true });
    if (el) {
        // Reconnect the link dragged from the button to the parent element
        end.id = el.id;
    }
    
    return end;
};

export const defaultConnector = cubicConnector;

export const defaultAnchor = {
    name: 'perpendicular',
    args: {
        useModelGeometry: true,
    }
};

export const interactive = (cellView) => {
    const cell = cellView.model;
    return {
        addLinkFromMagnet: true,
        elementMove: Boolean(cell.get(Attribute.CustomPosition)),
        linkMove: false,
        labelMove: false
    };
};
