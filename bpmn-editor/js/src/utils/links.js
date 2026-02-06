import { ShapeTypes } from '../shapes/shapes-typing';
import { PlaceholderShapeTypes } from '../shapes/placeholder/placeholder-config';
import { DataShapeTypes } from '../shapes/data/data-config';
import { AnnotationShapeTypes } from '../shapes/annotation/annotation-config';
import { FlowShapeTypes } from '../shapes/flow/flow-config';
import { AnnotationLink } from '../shapes/annotation/annotation-shapes';
import { DataAssociation } from '../shapes/data/data-shapes';
import { Conditional, Default, Message, Sequence } from '../shapes/flow/flow-shapes';
import { isPoolShared } from '.';

const DEFAULT_LINK_STROKE = '#333';

const LINK_CONNECTIONS = {
    [PlaceholderShapeTypes.LINK]: Sequence,
    [AnnotationShapeTypes.LINK]: AnnotationLink,
    [DataShapeTypes.DATA_ASSOCIATION]: DataAssociation,
    [FlowShapeTypes.SEQUENCE]: Sequence,
    [FlowShapeTypes.MESSAGE]: Message,
    [FlowShapeTypes.DEFAULT]: Default,
    [FlowShapeTypes.CONDITIONAL]: Conditional
};

export function resolveDefaultLinkType(link) {
    
    const source = link.getSourceElement();
    const target = link.getTargetElement();
    
    if (!source || !target)
        return PlaceholderShapeTypes.LINK;
    
    const sourceShapeType = source.get('shapeType');
    const targetShapeType = target.get('shapeType');
    
    const isConnectedToAnnotation = ShapeTypes.ANNOTATION === sourceShapeType || ShapeTypes.ANNOTATION === targetShapeType;
    
    // The connection includes annotation - return annotation link
    if (isConnectedToAnnotation)
        return AnnotationShapeTypes.LINK;
    
    const dataTypes = [ShapeTypes.DATA_OBJECT, ShapeTypes.DATA_STORE];
    
    const isConnectedToData = dataTypes.includes(sourceShapeType) || dataTypes.includes(targetShapeType);
    
    // The connection includes data element - return data association link
    if (isConnectedToData)
        return DataShapeTypes.DATA_ASSOCIATION;
    
    const isConnectedToPool = ShapeTypes.POOL === sourceShapeType || ShapeTypes.POOL === targetShapeType;
    
    // The connection includes pool - return message flow by default
    if (isConnectedToPool || !isPoolShared(source, target))
        return FlowShapeTypes.MESSAGE;
    
    return FlowShapeTypes.SEQUENCE;
}

export function prepareLinkReplacement(link) {
    
    const linkType = resolveDefaultLinkType(link);
    
    // `replace` attribute is set in the `makeLink` method of the HaloService to indicate that the link is an initial placeholder
    const isPlaceholder = link.get('replace');
    
    // If link is already of the correct type, don't replace it
    if (linkType === link.get('type') && !isPlaceholder)
        return link;
    
    if (isPlaceholder) {
        // Set the stroke color to the initial color if the link is a placeholder
        link.attr('line/stroke', DEFAULT_LINK_STROKE);
        link.unset('replace');
    }
    
    const newLink = new LINK_CONNECTIONS[linkType]({ id: link.id });
    newLink.copyFrom(link);
    return newLink;
}

export function validateAndReplaceConnections(cell, graph) {
    
    const links = graph.getConnectedLinks(cell);
    const replacements = [];
    
    links.forEach((link) => {
        const source = link.getSourceCell();
        const target = link.getTargetCell();
        
        // If connection is valid, replace the placeholder link
        if (source.validateConnection(target)) {
            const replacement = prepareLinkReplacement(link);
            if (replacement !== link) {
                replacements.push(replacement);
            }
            return;
        }
        
        link.remove();
    });
    
    graph.syncCells(replacements);
}
