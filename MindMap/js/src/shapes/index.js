import { Idea, IdeaView } from './idea';
import { Connection } from './connection';

export function makeElement(node) {
    const { children, ...attributes } = node;
    return new Idea({
        ...attributes,
        z: 2
    });
}

export function makeLink(parentElement, childElement) {
    return new Connection({
        z: 1,
        source: {
            id: parentElement.id
        },
        target: {
            id: childElement.id
        },
        attrs: {
            line: {
                targetMarker: null
            }
        },
    });
}

export const shapes = {
    Idea,
    IdeaView,
    Connection
};
