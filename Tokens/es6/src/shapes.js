import { dia, shapes } from '@joint/plus';
export class Node extends dia.Element {
    constructor() {
        super(...arguments);
        this.markup = [{
                tagName: 'rect',
                selector: 'body',
            }, {
                tagName: 'text',
                selector: 'label',
            }];
    }
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'app.Node', z: 100, size: {
                width: 120,
                height: 40
            }, attrs: {
                root: {
                    pointerEvents: 'none'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: '#FFFFFF',
                    stroke: '#A0A0A0',
                },
                label: {
                    x: 'calc(0.5 * w)',
                    y: 'calc(0.5 * h)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fontSize: 14
                },
            } });
    }
    setText(text) {
        return this.attr('label/text', text || '');
    }
}


export class Link extends dia.Link {
    constructor() {
        super(...arguments);
        this.markup = [{
                tagName: 'path',
                selector: 'wrapper',
                attributes: {
                    'fill': 'none',
                    'stroke': 'transparent'
                }
            }, {
                tagName: 'path',
                selector: 'line',
                attributes: {
                    'fill': 'none',
                }
            }];
    }
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'app.Link', z: 101, attrs: {
                root: {
                    pointerEvents: 'none'
                },
                line: {
                    connection: true,
                    stroke: '#A0A0A0',
                    strokeWidth: 1,
                },
                wrapper: {
                    connection: true,
                    strokeWidth: 10,
                    strokeLinejoin: 'round'
                }
            } });
    }
    connect(sourceId, targetId) {
        return this.set({
            source: { id: sourceId },
            target: { id: targetId }
        });
    }
}
export class Token extends dia.Element {
    constructor() {
        super(...arguments);
        this.markup = [{
                tagName: 'rect',
                selector: 'body',
                attributes: {
                    'cursor': 'pointer',
                }
            }, {
                tagName: 'text',
                selector: 'label',
                attributes: {
                    'cursor': 'pointer',
                }
            }];
    }
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'app.Token', z: 102, size: { width: 24, height: 16 }, position: { x: 250, y: 10 }, hidden: true, attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: '#FFFFFF',
                    stroke: '#A0A0A0',
                    strokeWidth: 1
                },
                label: {
                    x: 'calc(0.5 * w)',
                    y: 'calc(0.5 * h)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fontSize: 14,
                    fill: '#303740'
                },
            } });
    }
    setText(text) {
        return this.attr('label/text', text || '');
    }
}

Object.assign(shapes, {
    app: {
        Node,
        Link,
        Token
    }
});
