import type { dia, g } from '@joint/plus';
import { anchors, routers } from '@joint/plus';
import { GroupModel } from './models';

function getParentGroup(cell: dia.Cell): dia.Element | null {
    const parent = cell.getParentCell();
    if (parent && parent.isElement() && GroupModel.isGroup(parent as dia.Element)) {
        return parent as dia.Element;
    }
    return null;
}

// Returns the parent group if this element's link end should be
// treated as cross-group (anchor/route on the group, not the element).
// Returns null if same-group or not in a group.
function getCrossGroup(element: dia.Element, link: dia.Link): dia.Element | null {
    const group = getParentGroup(element);
    if (!group) return null;
    const sourceId = link.source().id;
    const targetId = link.target().id;
    if (!sourceId || !targetId) return null;
    const otherId = element.id === sourceId ? targetId : sourceId;
    const otherCell = element.graph?.getCell(otherId);
    if (!otherCell || !otherCell.isElement()) return null;
    const otherGroup = getParentGroup(otherCell as dia.Element);
    // Same group
    if (otherGroup && otherGroup.id === group.id) return null;
    // Other element not in the group, but its bbox is contained
    // within this group's bbox — treat as same-group (internal link)
    if (!otherGroup && group.getBBox().intersect((otherCell as dia.Element).getBBox())) return null;
    return group;
}

/**
 * Custom anchor that delegates to `midSide`. For cross-group links,
 * computes the anchor on the parent group instead of the element itself.
 * Same-group and ungrouped links anchor on the element as usual.
 */
export function groupAwareAnchor(
    endView: dia.CellView,
    endMagnet: SVGElement,
    anchorReference: g.Point | SVGElement,
    opt: anchors.MidSideAnchorArguments,
    endType: dia.LinkEnd,
    linkView: dia.LinkView
): g.Point {
    const element = endView.model;
    const group = getParentGroup(element);

    const midSideOptions: anchors.MidSideAnchorArguments = { mode: 'prefer-horizontal', useModelGeometry: true };

    if (group && element.isElement()) {
        const crossGroup = getCrossGroup(element as dia.Element, linkView.model);
        if (crossGroup) {
            const groupView = crossGroup.findView(endView.paper!);
            return anchors.midSide.call(linkView, groupView, groupView.el, anchorReference, midSideOptions, endType, linkView);
        }
    }

    // Same group, no group, or point end — anchor on element
    return anchors.midSide.call(linkView, endView, endMagnet, anchorReference, midSideOptions, endType, linkView);
}

/**
 * Custom router that wraps `rightAngle`. For cross-group links, proxies
 * the linkView so `sourceView`/`targetView` and `sourceBBox`/`targetBBox`
 * point to the parent group, making the router treat the group as the
 * obstacle to route around.
 */
export function groupAwareRouter(
    vertices: dia.Point[],
    args: routers.RightAngleRouterArguments,
    linkView: dia.LinkView
): dia.Point[] {
    const link = linkView.model;
    const paper = linkView.paper!;
    const sourceId = link.source().id;
    const targetId = link.target().id;

    // Build overrides for the proxy
    const overrides: Record<string, unknown> = {};

    if (sourceId && targetId) {
        const graph = link.graph;
        const sourceEl = graph.getCell(sourceId);
        const targetEl = graph.getCell(targetId);

        if (sourceEl?.isElement()) {
            const sourceGroup = getCrossGroup(sourceEl as dia.Element, link);
            if (sourceGroup) {
                const groupView = sourceGroup.findView(paper);
                overrides.sourceView = groupView;
                overrides.sourceBBox = sourceGroup.getBBox();
            }
        }

        if (targetEl?.isElement()) {
            const targetGroup = getCrossGroup(targetEl as dia.Element, link);
            if (targetGroup) {
                const groupView = targetGroup.findView(paper);
                overrides.targetView = groupView;
                overrides.targetBBox = targetGroup.getBBox();
            }
        }
    }

    const proxiedLinkView = Object.keys(overrides).length > 0
        ? new Proxy(linkView, {
            get(target, prop) {
                if (prop in overrides) return overrides[prop as string];
                return Reflect.get(target, prop);
            }
        })
        : linkView;

    return routers.rightAngle.call(proxiedLinkView, vertices, args, proxiedLinkView);
}
