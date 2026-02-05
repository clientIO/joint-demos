import { shapes } from '@joint/plus';
import { EL_WIDTH, EL_HEIGHT, LABEL_MARGIN, STROKE_WIDTH, LINE_HEIGHT } from './theme';
import { Shapes, Connections, ConnectionDirection, ConnectionStyle } from './enums';

const LABEL_ATTRIBUTES = {
    fontSize: 13,
    fontFamily: 'sans-serif',
    fill: '#131E29',
    textAnchor: 'middle',
    lineHeight: LINE_HEIGHT,
};

const LABEL_ATTRIBUTES_MIDDLE = Object.assign(Object.assign({}, LABEL_ATTRIBUTES), { y: 'calc(h / 2)', textVerticalAnchor: 'middle' });

const LABEL_ATTRIBUTES_BOTTOM = Object.assign(Object.assign({}, LABEL_ATTRIBUTES), { y: `calc(h + ${LABEL_MARGIN})`, textVerticalAnchor: 'top' });

const LABEL_STROKE = CSS.supports('paint-order', 'stroke') ? {
    stroke: '#fff',
    paintOrder: 'stroke',
    strokeWidth: 2
} : {
// Fallback for browsers that do not support `paint-order`
};

export function makeElement(node, parent, index) {
    const { id, label = '', type = Shapes.Device, size = null, hidden = false, boundary = null, boundaryLabel = '', connectionDirection = ConnectionDirection.None, connectionStyle = ConnectionStyle.Solid, connections = Connections.Parallel } = node;
    let element;
    if (!id)
        throw new Error('The node must have an ID.');
    switch (type) {
        case Shapes.Router:
            element = makeRouterElement(id, label);
            break;
        case Shapes.Virtual:
            element = makeVirtualElement(id, label);
            break;
        case Shapes.Cloud:
            element = makeCloudElement(id, label);
            break;
        case Shapes.Computer:
            element = makeComputerElement(id, label);
            break;
        case Shapes.Line:
            element = makeLineElement(id, label);
            break;
        default:
            element = makeDeviceElement(id, label);
            break;
    }
    
    const attributes = {
        prevSiblingGap: 0,
        nextSiblingGap: 0,
        offset: 0,
        minSize: size,
        hidden,
        boundary,
        boundaryLabel,
        connectionDirection,
        connectionStyle,
        connections,
    };
    // Minimal size (it could be overridden by the size of children)
    if (size) {
        attributes.size = { width: size };
    }
    // Property path in the `dataModel`
    if (parent) {
        attributes.path = parent.get('path') + '/children/' + index;
    }
    else {
        attributes.path = 'data';
    }
    // Level
    attributes.level = parent ? parent.get('level') + 1 : 0;
    // Hidden
    //   If the element is hidden but selected, it should be
    //   partially visible.
    attributes.attrs = {
        root: {
            opacity: hidden ? 0.3 : 1
        }
    };
    // Perform a single update to avoid multiple updates
    element.prop(attributes);
    return element;
}

export function makeRouterElement(id, label) {
    return new shapes.standard.Cylinder({
        id,
        size: { width: EL_WIDTH, height: EL_HEIGHT },
        childOffset: getLabelHeight(label),
        labelPosition: 'bottom',
        attrs: {
            root: {
                magnetSelector: 'body'
            },
            label: Object.assign(Object.assign({}, LABEL_ATTRIBUTES_BOTTOM), { text: label }),
            body: {
                stroke: '#131E29',
                strokeWidth: STROKE_WIDTH,
                fill: '#DDE6ED',
            },
            top: {
                stroke: '#131E29',
                strokeWidth: STROKE_WIDTH,
                fill: '#F2F5F8',
            }
        }
    });
}

export function makeDeviceElement(id, label) {
    return new shapes.standard.Rectangle({
        id,
        size: {
            width: EL_WIDTH,
            height: 2 * LABEL_MARGIN + Math.max(getLabelHeight(label), LINE_HEIGHT)
        },
        childOffset: 0,
        attrs: {
            root: {
                magnetSelector: 'body'
            },
            label: Object.assign(Object.assign(Object.assign({}, LABEL_ATTRIBUTES_MIDDLE), LABEL_STROKE), { fill: '#ED2637', text: label }),
            body: {
                rx: 5,
                ry: 5,
                stroke: '#131E29',
                strokeWidth: STROKE_WIDTH,
                fill: '#DDE6ED'
            }
        }
    });
}

export function makeVirtualElement(id, label) {
    return new shapes.standard.Rectangle({
        id,
        size: {
            width: EL_WIDTH,
            height: 2 * LABEL_MARGIN + Math.max(getLabelHeight(label), LINE_HEIGHT)
        },
        childOffset: 0,
        attrs: {
            root: {
                magnetSelector: 'body'
            },
            label: Object.assign(Object.assign(Object.assign({}, LABEL_ATTRIBUTES_MIDDLE), LABEL_STROKE), { fill: '#ED2637', text: label }),
            body: {
                rx: 5,
                ry: 5,
                stroke: '#304254',
                strokeDasharray: '15,1',
                strokeWidth: STROKE_WIDTH,
                fill: '#DFE6EC'
            }
        }
    });
}

export function makeCloudElement(id, label) {
    return new shapes.standard.Path({
        id: id,
        size: { width: EL_WIDTH, height: EL_HEIGHT },
        childOffset: getLabelHeight(label),
        labelPosition: 'bottom',
        attrs: {
            root: {
                magnetSelector: 'body'
            },
            label: Object.assign(Object.assign({}, LABEL_ATTRIBUTES_BOTTOM), { text: label }),
            body: {
                refD: 'M 25,60 a 20,20 1 0,0 0,40 h 50 a 20,20 1 0,0 0,-40 a 10,10 1 0,0 -15,-10 a 15,15 1 0,0 -35,10 z',
                stroke: '#131E29',
                strokeWidth: STROKE_WIDTH,
                fill: '#DDE6ED'
            }
        }
    });
}

const computerImage = /* xml */ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="#2274A5">
    <path
        d="M43,35H29.195c0.595,3.301,2.573,5.572,4.401,7H36c0.553,0,1,0.447,1,1 s-0.447,1-1,1H12c-0.553,0-1-0.447-1-1s0.447-1,1-1h2.403c1.827-1.428,3.807-3.699,4.401-7H5c-2.209,0-4-1.791-4-4V8  c0-2.209,1.791-4,4-4h38c2.209,0,4,1.791,4,4v23C47,33.209,45.209,35,43,35z M17.397,42h13.205c-1.595-1.682-3.015-3.976-3.459-7  h-6.287C20.412,38.024,18.992,40.318,17.397,42z M45,8c0-1.104-0.896-2-2-2H5C3.896,6,3,6.896,3,8v19l0,0h42V8z M45,29H3l0,0v2  c0,1.104,0.896,2,2,2h14l0,0h10l0,0h14c1.104,0,2-0.896,2-2V29z M24,32c-0.553,0-1-0.447-1-1s0.447-1,1-1s1,0.447,1,1  S24.553,32,24,32z"
    />
</svg>
`;

export function makeComputerElement(id, label) {
    return new shapes.standard.BorderedImage({
        id,
        size: { width: EL_WIDTH, height: EL_HEIGHT },
        childOffset: getLabelHeight(label),
        labelPosition: 'bottom',
        selector: 'background',
        attrs: {
            root: {
                magnetSelector: 'background',
            },
            label: Object.assign(Object.assign({}, LABEL_ATTRIBUTES_BOTTOM), { text: label }),
            border: {
                stroke: '#131E29',
                strokeWidth: STROKE_WIDTH,
                rx: 5,
                ry: 5
            },
            background: {
                fill: '#DDE6ED',
                rx: 5,
                ry: 5
            },
            image: {
                xlinkHref: `data:image/svg+xml;utf8,${encodeURIComponent(computerImage)}`,
                width: 'calc(w - 6)',
                height: 'calc(h - 6)',
                x: 3,
                y: 3
            },
        }
    });
}

export function makeLineElement(id, label) {
    return new shapes.standard.Rectangle({
        id,
        size: { width: EL_WIDTH, height: STROKE_WIDTH },
        childOffset: getLabelHeight(label),
        labelPosition: 'bottom',
        attrs: {
            root: {
                magnetSelector: 'body'
            },
            body: {
                stroke: 'none',
                fill: '#131E29',
                rx: 0,
                ry: 0
            },
            label: Object.assign(Object.assign({}, LABEL_ATTRIBUTES_BOTTOM), { text: label })
        }
    });
}

export function makeLink(parentElement, childElement, { direction = 'none', style = 'solid' }) {
    // Set the sourceMarker and targetMarker based on the direction
    let sourceMarker = null;
    let targetMarker = null;
    const d = 'M 6 -3 0 0 6 3 Z';
    switch (direction) {
        case ConnectionDirection.Forward:
            targetMarker = { type: 'path', d };
            break;
        case ConnectionDirection.Backward:
            sourceMarker = { type: 'path', d };
            break;
        case ConnectionDirection.Bidirectional:
            sourceMarker = { type: 'path', d };
            targetMarker = { type: 'path', d };
            break;
        case ConnectionDirection.None:
        default:
            break;
    }
    // Set the strokeDasharray based on the style
    let strokeDasharray = '';
    switch (style) {
        case ConnectionStyle.Dotted:
            strokeDasharray = `${STROKE_WIDTH},${STROKE_WIDTH}`;
            break;
        case ConnectionStyle.Dashed:
            strokeDasharray = `${5 * STROKE_WIDTH},${STROKE_WIDTH}`;
            break;
        case ConnectionStyle.Solid:
        default:
            strokeDasharray = 'none';
            break;
    }
    // Create the link
    return new shapes.standard.Link({
        id: `${parentElement.id}-${childElement.id}`,
        source: { id: parentElement.id },
        target: { id: childElement.id },
        z: -1,
        vertices: [],
        attrs: {
            line: {
                strokeWidth: STROKE_WIDTH,
                stroke: '#3A5C7E',
                strokeDasharray,
                targetMarker,
                sourceMarker,
            }
        }
    });
}


export function makeBoundaryElement(id, label) {
    return new shapes.standard.Rectangle({
        id,
        attrs: {
            root: {
                pointerEvents: 'none'
            },
            label: {
                text: label,
                x: 'calc(w / 2)',
                y: 'calc(h - 10)',
                textAnchor: 'middle',
                textVerticalAnchor: 'bottom',
                fontSize: 13,
                lineHeight: LINE_HEIGHT,
                fill: '#2274A5',
            },
            body: {
                fill: '#F4D35E',
                fillOpacity: 0.2,
                stroke: '#F4D35E',
                strokeWidth: STROKE_WIDTH / 2,
                rx: 5,
                ry: 5
            }
        }
    });
}

export function getLabelHeight(label) {
    if (!label)
        return 0;
    return label.split('\n').length * LINE_HEIGHT;
}

export function getElementBBox(element) {
    const bbox = element.getBBox();
    const label = element.attr('label');
    if (!label)
        return bbox;
    switch (element.get('labelPosition')) {
        case 'bottom': {
            bbox.height += element.get('childOffset');
            break;
        }
    }
    return bbox;
}
