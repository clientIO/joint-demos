import { anchors, connectors } from '@joint/plus';

const LINK_SOURCE_ANCHOR_OFFSET = 25;
const LINK_TARGET_ANCHOR_OFFSET = 30;
const LINK_SOURCE_CONNECTOR_OFFSET = 25;
const LINK_TARGET_CONNECTOR_OFFSET = 25;

export const defaultAnchor = (view, magnet, refPoint, options, endType, linkView) => {
    const anchor = anchors.midSide.call(linkView, view, magnet, refPoint, {
        ...options,
        mode: 'horizontal',
        padding: endType === 'source' ? LINK_SOURCE_ANCHOR_OFFSET : LINK_TARGET_ANCHOR_OFFSET
    }, endType, linkView);
    return anchor;
};

export const defaultConnector = function (sourcePoint, targetPoint, routePoints, _opt, linkView) {
    const link = linkView.model;
    const opt = {
        cornerType: 'cubic',
        cornerRadius: 10,
    };
    
    const midPoints = [sourcePoint, ...routePoints];
    const sourceTipPoint = sourcePoint.clone().move(linkView.sourceBBox.center(), -LINK_SOURCE_CONNECTOR_OFFSET);
    const targetTipPoint = targetPoint.clone();
    
    if (link.getTargetCell()) {
        // Don't move the target point if the link is being dragged
        // (i.e. the target is not an element)
        targetTipPoint.move(linkView.targetBBox.center(), -LINK_TARGET_CONNECTOR_OFFSET);
        midPoints.push(targetPoint);
    }
    
    return connectors.straight(sourceTipPoint, targetTipPoint, midPoints, opt);
};

export const overflow = true;
export const interactive = false;
export const async = true;
export const autoFreeze = true;
export const viewManagement = true;
// pointer move count threshold for click detection
export const clickThreshold = 5;
