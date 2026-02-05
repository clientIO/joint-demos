import * as joint from '@joint/plus';
const cache = new Map();
export var app;
(function (app) {
    class Link extends joint.shapes.standard.Link {
        constructor() {
            super(...arguments);
            this.defaultLabel = {
                attrs: {
                    rect: {
                        fill: '#ffffff',
                        stroke: '#353535',
                        strokeWidth: 1,
                        width: 'calc(w + 10)',
                        height: 'calc(h + 10)',
                        x: 'calc(x - 5)',
                        y: 'calc(y - 5)'
                    }
                }
            };
            this.getDataWidthCached = function (d) {
                if (cache.has(d)) {
                    return cache.get(d);
                }
                else {
                    const bbox = (new joint.g.Path(d)).bbox();
                    cache.set(d, bbox ? bbox.width : 0);
                    return cache.get(d);
                }
            };
        }
        static connectionPoint(line, view, magnet, _opt, type, linkView) {
            const link = linkView.model;
            const markerWidth = (link.get('type') === 'app.Link') ? link.getMarkerWidth(type) : 0;
            const opt = { offset: markerWidth, stroke: true };
            // connection point for UML shapes lies on the root group containing all the shapes components
            const modelType = view.model.get('type');
            // taking the border stroke-width into account
            if (modelType === 'standard.InscribedImage') {
                opt.selector = 'border';
            }
            return joint.connectionPoints.boundary.call(this, line, view, magnet, opt, type, linkView);
        }
        defaults() {
            return joint.util.defaultsDeep({
                type: 'app.Link',
                router: {
                    name: 'normal'
                },
                connector: {
                    name: 'rounded'
                },
                labels: [],
                attrs: {
                    line: {
                        stroke: '#3771B8',
                        strokeDasharray: '0',
                        strokeWidth: 2,
                        fill: 'none',
                        sourceMarker: {
                            type: 'path',
                            d: 'M 0 0 0 0',
                            stroke: 'none'
                        },
                        'targetMarker': {
                            'd': 'M 0 0 0 0'
                        }
                    }
                }
            }, joint.shapes.standard.Link.prototype.defaults);
        }
        getMarkerWidth(type) {
            const d = (type === 'source') ? this.attr('line/sourceMarker/d') : this.attr('line/targetMarker/d');
            return this.getDataWidth(d);
        }
        getDataWidth(d) {
            return this.getDataWidthCached(d);
        }
    }
    app.Link = Link;
})(app || (app = {}));
// re-export build-in shapes from rappid
export const standard = joint.shapes.standard;
