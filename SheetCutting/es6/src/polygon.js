import { dia, util, g, V } from '@joint/plus';

const POLYGON_SELECTOR = 'body';


// For debugging purposes (see the shape defaults() too)
// const polygonMarkup = util.svg`
//     <rect @selector="bg" fill="#5B9279" />
//     <polygon @selector="body"/>
//     <circle @selector="center" fill="#2D82B7" r="5" />
// `
const polygonMarkup = util.svg /* xml */ `
    <polygon @selector="${POLYGON_SELECTOR}"/>
`;

const fillPatternMarkup = util.svg /* xml */ `
    <rect width="12" height="12" fill="#FFF" stroke="none" />
    <path d="M 0 0 L 12 12 M 6 -6 L 18 6 M -6 6 L 6 18" />
`;

export class Polygon extends dia.Element {
    
    preinitialize() {
        this.markup = polygonMarkup;
    }
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        this.on('change:rotation', (_, rotation) => this.setAngle(rotation, { ignoreHistory: true }));
        this.setAngle(this.get('rotation'));
    }
    
    defaults() {
        return Object.assign(Object.assign({}, dia.Element.prototype.defaults), { type: 'Polygon', attrs: {
                root: {
                    cursor: 'grab'
                },
                body: {
                    fill: {
                        type: 'pattern',
                        attrs: {
                            width: 12,
                            height: 12,
                            strokeWidth: 1,
                            stroke: '#ddd',
                            fill: 'none',
                        },
                        markup: fillPatternMarkup,
                    },
                    stroke: '#252f39',
                    strokeWidth: 1,
                    strokeDasharray: '10,2',
                },
                // For debugging purposes (see the shape markup too)
                // bg: {
                //     width: 'calc(w)',
                //     height: 'calc(h)',
                // },
                // center: {
                //     cx: 'calc(w / 2)',
                //     cy: 'calc(h / 2)',
                // }
            } });
    }
    
    setAngle(angle, setOptions = {}) {
        const newPolyline = this.getGeometry({ angle });
        const newBBox = newPolyline.bbox();
        const rotationCenter = this.getCenterOfRotation().offset(this.position());
        const newCx = this.get('cx0') - newBBox.x;
        const newCy = this.get('cy0') - newBBox.y;
        // The rendered polyline must have origin at 0,0
        newPolyline.translate(-newBBox.x, -newBBox.y);
        this.attr('body/points', newPolyline.serialize(), setOptions);
        const x = rotationCenter.x - newCx;
        const y = rotationCenter.y - newCy;
        const roundedX = Math.round(x);
        const roundedY = Math.round(y);
        const dx = roundedX - x;
        const dy = roundedY - y;
        this.set({
            position: {
                x: roundedX,
                y: roundedY,
            },
            size: {
                width: Math.round(newBBox.width),
                height: Math.round(newBBox.height)
            },
            cx: newCx + dx,
            cy: newCy + dy
        }, setOptions);
    }
    
    getGeometry({ angle = this.get('rotation') } = {}) {
        const { geometry, cx0, cy0 } = this.attributes;
        if (!geometry)
            throw new Error('No geometry in the element');
        const polygon = new g.Polygon(geometry);
        if (angle) {
            // The center of the rotation of original polygon
            const center = { x: cx0, y: cy0 };
            polygon.points.forEach((point) => point.rotate(center, -angle));
        }
        return polygon;
    }
    
    getGeometryAbsolute(options = {}) {
        const { angle = this.get('rotation'), position = this.position() } = options;
        const geometry = this.getGeometry({ angle: angle });
        const { cx, cy, cx0, cy0 } = this.attributes;
        const tx = position.x + cx - cx0;
        const ty = position.y + cy - cy0;
        return geometry.translate(tx, ty);
    }
    
    getCenterOfRotation() {
        return new g.Point(this.get('cx'), this.get('cy'));
    }
    
    addMarker() {
        this.attr(['body', 'sourceMarker'], {
            markup: util.svg /* xml */ `
                <svg x="-5" y="-5" width="10" height="10" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0 10 20 10 M 10 0 10 20" stroke="#131E29" stroke-width="4" />
                </svg>
            `
        }, { rewrite: true });
        return this;
    }
    
    isWithinBBox(bbox, options = {}) {
        const { angle = this.get('rotation'), position } = options;
        const geometry = this.getGeometryAbsolute({ angle, position });
        const elBBox = geometry.bbox();
        return elBBox.x < bbox.x
            || elBBox.y < bbox.y
            || elBBox.x + elBBox.width > bbox.x + bbox.width
            || elBBox.y + elBBox.height > bbox.y + bbox.height;
    }
    
    calcArea() {
        
        const vertices = this.getGeometry().points;
        
        let total = 0;
        for (let i = 0, l = vertices.length; i < l; i++) {
            const addX = vertices[i].x;
            const addY = vertices[i == vertices.length - 1 ? 0 : i + 1].y;
            const subX = vertices[i == vertices.length - 1 ? 0 : i + 1].x;
            const subY = vertices[i].y;
            total += (addX * addY * 0.5);
            total -= (subX * subY * 0.5);
        }
        
        return Math.abs(total);
    }
    
    static fromPathData(d) {
        const path = new g.Path(V.normalizePathData(d));
        const { x, y, width, height } = path.bbox();
        path.translate(-x, -y);
        const [polyline] = path.toPolylines();
        const shape = new Polygon({
            rotation: 0,
            geometry: polyline.serialize(),
            cx0: width / 2,
            cy0: height / 2,
            cx: width / 2,
            cy: height / 2,
        });
        return shape;
    }
}

Polygon.selector = POLYGON_SELECTOR;
