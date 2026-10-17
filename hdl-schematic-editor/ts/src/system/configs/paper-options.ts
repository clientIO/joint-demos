import { Attribute } from '../diagram/const';
import { config } from './system';

import type { dia } from '@joint/plus';

export const magnetThreshold = 'onleave';
export const clickThreshold = 10;
export const moveThreshold = 5;
export const labelsLayer = true;
export const snapLinks = true;
export const markAvailable = true;
export const linkPinning = false;

export const allowLink: dia.Paper.Options['allowLink'] = (linkView: dia.LinkView) => {
    const link = linkView.model;
    const target = link.getTargetElement();
    const source = link.getSourceElement();
    if (!source || !target) return false;
    // Forbid immediate parent-child connections
    if (source === target) return false;
    return true;
};

export const validateMagnet: dia.Paper.Options['validateMagnet'] = (cellView: dia.CellView, magnet: SVGElement) => {
    // Forbid connections from input ports
    if (cellView.findAttribute('port-group', magnet) === config.inboundPortGroupName) {
        return false;
    }
    return true;
};

export const validateConnection: dia.Paper.Options['validateConnection'] = (cellViewS: dia.CellView, magnetS: SVGElement, cellViewT: dia.CellView, magnetT: SVGElement) => {
    const source = cellViewS.model;
    const target = cellViewT.model;
    const graph = cellViewS.model.graph;

    if (source.isLink() || target.isLink()) return false;

    // Forbid element loops
    if (source === target) return false;

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
            && linkSource.port === sourcePortId) return true;

        return false;
    })) return false;

    return (
        !target.get(Attribute.CustomPosition) &&
        !target.get(Attribute.SourceOnly)
    );
};

export const defaultConnector: dia.Paper.Options['defaultConnector'] = {
    name: 'straight',
    args: {
        cornerType: 'cubic',
        cornerRadius: 30,
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
