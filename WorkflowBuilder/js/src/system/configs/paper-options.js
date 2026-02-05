import { Attribute } from '../diagram/const';
import { config } from './system';

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
    return true;
};

export const validateMagnet = (cellView, magnet) => {
    // Forbid connections from input ports
    if (cellView.findAttribute('port-group', magnet) === config.inboundPortGroupName) {
        return false;
    }
    return true;
};

export const validateConnection = (cellViewS, magnetS, cellViewT, magnetT) => {
    const source = cellViewS.model;
    const target = cellViewT.model;
    const graph = cellViewS.model.graph;
    
    if (source.isLink() || target.isLink())
        return false;
    
    // Forbid element loops
    if (source === target)
        return false;
    
    // Forbid connections to output ports
    if (cellViewT.findAttribute('port-group', magnetT) === config.outboundPortGroupName) {
        return false;
    }
    
    const targetPortId = cellViewT.findAttribute('port', magnetT);
    const sourcePortId = cellViewS.findAttribute('port', magnetS);
    
    const links = graph.getConnectedLinks(source, { outbound: true });
    // Forbid connections to elements that are already connected
    if (links.some(link => {
        const linkSource = link.source();
        const linkTarget = link.target();
        
        if (linkSource.id === source.id
            && linkTarget.id === target.id
            && linkTarget.port === targetPortId
            && linkSource.port === sourcePortId)
            return true;
        
        return false;
    }))
        return false;
    
    return (!target.get(Attribute.CustomPosition) &&
        !target.get(Attribute.SourceOnly));
};

export const defaultConnector = {
    name: 'straight',
    args: {
        cornerType: 'cubic',
        cornerRadius: 30,
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
