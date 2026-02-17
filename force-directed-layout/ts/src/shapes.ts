import { shapes, util } from '@joint/core';

export class Entity extends shapes.standard.Rectangle {
    defaults() {
        return util.defaultsDeep({
            type: 'erd.Entity',
            size: { width: 100, height: 40 },
            forceDirectedAttributes: {
                fixed: true
            },
            attrs: {
                body: {
                    fill: '#61C9A8',
                    strokeWidth: 2,
                    width: 'calc(w)',
                    height: 'calc(h)',
                    stroke: '#4C3B4D'
                },
                label: {
                    text: 'Entity',
                    fill: '#4C3B4D',
                    fontSize: 12,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    x: 'calc(w/2)',
                    y: 'calc(h/2)',
                    fontWeight: 'bold'
                }
            }
        }, super.defaults);
    }
}

export class Relationship extends shapes.standard.Polygon {
    defaults() {
        return util.defaultsDeep({
            type: 'erd.Relationship',
            size: { width: 100, height: 40 },
            attrs: {
                body: {
                    refPoints: '0,20 20,0 40,20 20,40',
                    fill: '#FFEEDB',
                    strokeWidth: 2,
                    stroke: '#4C3B4D'
                },
                label: {
                    text: 'Relationship',
                    fill: '#4C3B4D',
                    fontSize: 12,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    x: 'calc(w/2)',
                    y: 'calc(h/2)',
                    fontWeight: 'bold'
                }
            },
        }, super.defaults);
    }
}

export class Attribute extends shapes.standard.Ellipse {
    defaults() {
        return util.defaults({
            type: 'erd.Attribute',
            size: { width: 100, height: 40 },
            forceDirectedAttributes: {
                weight: 3
            },
            attrs: {
                body: {
                    cx: 'calc(w/2)',
                    cy: 'calc(h/2)',
                    fill: '#F6C876',
                    rx: 'calc(w/2)',
                    ry: 'calc(h/2)',
                    strokeWidth: 2,
                    stroke: '#4C3B4D'
                },
                label: {
                    text: 'Attribute',
                    fill: '#4C3B4D',
                    fontSize: 12,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    x: 'calc(w/2)',
                    y: 'calc(h/2)',
                    fontWeight: 'bold'
                }
            },
        }, super.defaults);
    }
}

export class Connection extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep({
            type: 'erd.Connection',
            connector: { name: 'straight' },
            attrs: {
                line: {
                    targetMarker: null
                }
            },
            z: -1
        }, super.defaults);
    }
}
