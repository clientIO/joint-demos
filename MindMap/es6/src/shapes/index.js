var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { Idea, IdeaView } from './idea';
import { Connection } from './connection';

export function makeElement(node) {
    const { children } = node, attributes = __rest(node, ["children"]);
    return new Idea(Object.assign(Object.assign({}, attributes), { z: 2 }));
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
