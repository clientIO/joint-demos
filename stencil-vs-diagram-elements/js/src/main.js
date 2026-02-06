import { dia, ui, shapes } from '@joint/plus';
import './styles.css';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' }
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 120,
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: '#FCFCFC'
            }
        };
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        marginX: 10,
        marginY: 10,
        horizontalAlign: 'left',
        // reset defaults
        resizeToFit: false,
        centre: false,
        dx: 0,
        dy: 0
    },
    // Create the preview element
    dragStartClone: (el) => {
        const strokeDasharray = '10,5';
        const { shapeType, attrs } = el.attributes;
        switch (shapeType) {
            case ShapeType.Ellipse:
                return new shapes.standard.Ellipse({
                    shapeType,
                    originalColor: attrs.body.fill,
                    size: { width: 120, height: 100 },
                    attrs: {
                        body: {
                            strokeDasharray
                        },
                        label: {
                            text: attrs.label.text,
                            fontFamily: 'sans-serif'
                        }
                    }
                });
            case ShapeType.Rhombus:
                return new shapes.standard.Path({
                    shapeType,
                    originalColor: attrs.body.fill,
                    size: { width: 120, height: 100 },
                    attrs: {
                        body: {
                            strokeDasharray,
                            d: attrs.body.d
                        },
                        label: {
                            text: attrs.label.text,
                            fontFamily: 'sans-serif'
                        }
                    }
                });
            case ShapeType.Label:
                return new shapes.standard.Path({
                    shapeType,
                    originalColor: attrs.body.fill,
                    size: { width: 120, height: 60 },
                    attrs: {
                        body: {
                            strokeDasharray,
                            d: attrs.body.d
                        },
                        label: {
                            text: attrs.label.text,
                            fontFamily: 'sans-serif',
                            refX: null,
                            x: 'calc(w / 2 + calc(h / 4))'
                        }
                    }
                });
            case ShapeType.Document:
                return new shapes.standard.Path({
                    shapeType,
                    originalColor: attrs.body.fill,
                    size: { width: 120, height: 100 },
                    attrs: {
                        body: {
                            strokeDasharray,
                            d: getDocumentPathData(15)
                        },
                        label: {
                            text: attrs.label.text,
                            fontFamily: 'sans-serif',
                            refY: null,
                            y: 'calc(h / 2 - 15)'
                        }
                    }
                });
            case ShapeType.Tooltip:
                return new shapes.standard.Path({
                    shapeType,
                    originalColor: attrs.body.fill,
                    size: { width: 120, height: 100 },
                    attrs: {
                        body: {
                            strokeDasharray,
                            d: getTooltipPathData(20)
                        },
                        label: {
                            text: attrs.label.text,
                            fontFamily: 'sans-serif'
                        }
                    }
                });
            case ShapeType.Rectangle:
            default:
                return new shapes.standard.Rectangle({
                    shapeType,
                    originalColor: attrs.body.fill,
                    size: { width: 120, height: 100 },
                    attrs: {
                        body: {
                            strokeDasharray
                        },
                        label: {
                            text: attrs.label.text,
                            fontFamily: 'sans-serif'
                        }
                    }
                });
        }
    },
    // Create the diagram element
    dragEndClone: (el) => {
        const clone = el.clone();
        clone.attr({
            body: {
                strokeDasharray: null,
                fill: clone.get('originalColor')
            }
        });
        clone.unset('originalColor');
        clone.unset('shapeType');
        return clone;
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

const stencilLabelAttrs = {
    refX: null, // reset the default
    x: 'calc(w+10)',
    textAnchor: 'start',
    fontFamily: 'sans-serif',
    fontSize: 12
};

const ShapeType = {
    Rectangle: 'Rectangle',
    Ellipse: 'Ellipse',
    Label: 'Label',
    Document: 'Document',
    Rhombus: 'Rhombus',
    Tooltip: 'Tooltip'
};

stencil.load([
    {
        type: 'standard.Rectangle',
        size: { width: 20, height: 20 },
        shapeType: ShapeType.Rectangle,
        attrs: {
            body: {
                fill: '#80aaff'
            },
            label: {
                ...stencilLabelAttrs,
                text: 'Rectangle'
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 20, height: 20 },
        shapeType: ShapeType.Ellipse,
        attrs: {
            body: {
                fill: '#80ffd5'
            },
            label: {
                ...stencilLabelAttrs,
                text: 'Ellipse'
            }
        }
    },
    {
        type: 'standard.Path',
        shapeType: ShapeType.Label,
        size: { width: 20, height: 20 },
        attrs: {
            body: {
                d: 'M 0 calc(0.5*h) calc(0.5*h) 0 H calc(w) V calc(h) H calc(0.5*h) Z',
                fill: '#ffeae5'
            },
            label: {
                ...stencilLabelAttrs,
                text: 'Label'
            }
        }
    },
    {
        type: 'standard.Path',
        shapeType: ShapeType.Document,
        size: { width: 20, height: 20 },
        attrs: {
            body: {
                d: getDocumentPathData(3),
                fill: '#b5ffff'
            },
            label: {
                ...stencilLabelAttrs,
                text: 'Document'
            }
        }
    },
    {
        type: 'standard.Path',
        shapeType: ShapeType.Rhombus,
        size: { width: 20, height: 20 },
        attrs: {
            body: {
                d: 'M calc(w/2) 0 calc(w) calc(h/2) calc(w/2) calc(h) 0 calc(h/2) Z',
                fill: '#ff9580'
            },
            label: {
                ...stencilLabelAttrs,
                text: 'Rhombus'
            }
        }
    },
    {
        type: 'standard.Path',
        shapeType: ShapeType.Tooltip,
        size: { width: 20, height: 20 },
        attrs: {
            body: {
                d: getTooltipPathData(5),
                fill: '#80aaff'
            },
            label: {
                ...stencilLabelAttrs,
                text: 'Tooltip'
            }
        }
    }
]);

function getDocumentPathData(offset) {
    const CP1_X_FACTOR = 0.16;
    const CP2_X_FACTOR = 0.33;
    const CURVE_END_X_FACTOR = 0.5;
    const CP3_X_FACTOR = 0.75;
    const CURVE_OFFSET = offset;
    return `
        M 0 0
        L 0 calc(h - ${CURVE_OFFSET})
        C calc(${CP1_X_FACTOR} * w) calc(h) calc(${CP2_X_FACTOR} * w) calc(h) calc(${CURVE_END_X_FACTOR} * w) calc(h - ${CURVE_OFFSET})
        S calc(${CP3_X_FACTOR} * w) calc(h - ${2 * CURVE_OFFSET
}) calc(w) calc(h - ${CURVE_OFFSET})
        L calc(w) 0
        Z
    `;
}

function getTooltipPathData(size) {
    return `
        M 0 0
        H calc(w)
        V calc(h)
        H ${2 * size}
        l -${size} ${size}
        v -${size}
        H 0
        Z
    `;
}
