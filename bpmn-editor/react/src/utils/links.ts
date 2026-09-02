import { ShapeTypes } from '../shapes/shapes-typing';
import { PlaceholderShapeTypes, linkTypeConstructors } from '../shapes/link-config';
import { DataShapeTypes } from '../shapes/data/data-config';
import { AnnotationShapeTypes } from '../shapes/annotation/annotation-config';
import { FlowShapeTypes } from '../shapes/flow/flow-config';
import { isPoolShared, isSwimlane } from '.';

import type { dia } from '@joint/plus';
import type { BpmnElement, BpmnLink, BpmnShape, LinkType } from '../shapes/shapes-typing';

const DEFAULT_LINK_STROKE = 'var(--bpmn-link)';

/**
 * The link type appropriate for the link's current endpoints (message flow
 * between pools, data association, annotation link, sequence flow otherwise).
 */
export function resolveDefaultLinkType(link: BpmnLink): LinkType {

    const source = link.getSourceElement();
    const target = link.getTargetElement();

    if (!source || !target) return PlaceholderShapeTypes.LINK;

    const sourceShapeType = source.get('shapeType');
    const targetShapeType = target.get('shapeType');

    const isConnectedToAnnotation = ShapeTypes.ANNOTATION === sourceShapeType || ShapeTypes.ANNOTATION === targetShapeType;

    // The connection includes annotation - return annotation link
    if (isConnectedToAnnotation) return AnnotationShapeTypes.LINK;

    const dataTypes = [ShapeTypes.DATA_OBJECT, ShapeTypes.DATA_STORE];

    const isConnectedToData = dataTypes.includes(sourceShapeType) || dataTypes.includes(targetShapeType);

    // The connection includes data element - return data association link
    if (isConnectedToData) return DataShapeTypes.DATA_ASSOCIATION;

    const isConnectedToPool = ShapeTypes.POOL === sourceShapeType || ShapeTypes.POOL === targetShapeType;

    // The connection includes pool - return message flow by default
    if (isConnectedToPool || !isPoolShared(source, target)) return FlowShapeTypes.MESSAGE;

    return FlowShapeTypes.SEQUENCE;
}

/**
 * A replacement link of the type matching the link's endpoints (same id), or
 * the link itself when it is already of the correct type.
 */
export function prepareLinkReplacement(link: BpmnLink): BpmnLink {

    const linkType = resolveDefaultLinkType(link);

    // `replace` attribute is set by the halo's `makeLink` factory to indicate that the link is an initial placeholder
    const isPlaceholder = link.get('replace');

    // If link is already of the correct type, don't replace it
    if (linkType === link.get('type') && !isPlaceholder) return link;

    if (isPlaceholder) {
        // Set the stroke color to the initial color if the link is a placeholder
        link.attr('line/stroke', DEFAULT_LINK_STROKE);
        link.unset('replace');
    }

    const newLink = new linkTypeConstructors[linkType]({ id: link.id });
    newLink.copyFrom(link);
    return newLink;
}

/**
 * Validates the cell's connections: invalid links are removed, valid ones are
 * replaced with the link type matching their endpoints.
 */
export function validateAndReplaceConnections(cell: dia.Cell, graph: dia.Graph) {

    const links = graph.getConnectedLinks(cell);
    const replacements: BpmnLink[] = [];

    links.forEach((link) => {
        const source = link.getSourceCell() as BpmnShape;
        const target = link.getTargetCell() as BpmnShape;

        // If connection is valid, replace the placeholder link
        if (source.validateConnection(target)) {
            const replacement = prepareLinkReplacement(link as BpmnLink);
            if (replacement !== link) {
                replacements.push(replacement);
            }
            return;
        }

        link.remove();
    });

    graph.syncCells(replacements);
}

// Annotations, groups and pools go after the flow shapes: an annotation or
// a group is an artifact and a pool is the participant a shape already sits
// in, so all three are the rarer choice — the list leads with what is
// usually wanted.
const TRAILING_TYPES = [ShapeTypes.ANNOTATION, ShapeTypes.GROUP, ShapeTypes.POOL];

const rank = (element: BpmnElement) => {
    const at = TRAILING_TYPES.indexOf(element.get('shapeType'));
    return at === -1 ? 0 : at + 1;
};

/**
 * The shapes the source may legally connect to, in the order they read on
 * screen. The rule is the shape's own `validateConnection()` — the same one
 * the pointer path enforces through `bpmnValidateConnection`, so the
 * keyboard cannot draw a link the mouse would refuse.
 */
export function getLinkTargets(graph: dia.Graph, source: BpmnElement): BpmnElement[] {
    return graph.getElements()
        // Pools are valid ends — a message flow runs between participants.
        // Lanes are not: their `validateConnection()` refuses outright.
        .filter((element): element is BpmnElement => element !== source && !isSwimlane(element))
        .filter((element) => (source as BpmnShape).validateConnection(element))
        .sort((a, b) => {
            const byKind = rank(a) - rank(b);
            if (byKind !== 0) return byKind;

            const from = a.position();
            const to = b.position();
            return from.x - to.x || from.y - to.y;
        });
}
