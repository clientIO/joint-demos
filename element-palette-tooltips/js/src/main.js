import { dia, ui, util, shapes, layout } from '@joint/plus';
import './styles.scss';
// Define colors

const GRID_SIZE = 20;
const SHAPES_GAP = 20;

const colors = {
    shape: '#ED2637',
    canvas: '#DDE6E9',
    stencil: '#F2F5F8'
};

const elementsJSON = [
    {
        type: 'standard.Rectangle',
        size: { width: 60, height: 40 },
        name: 'Rectangle',
        attrs: {
            body: {
                stroke: colors.shape
            }
        }
    },
    {
        type: 'standard.Rectangle',
        size: { width: 60, height: 40 },
        name: 'Rounded Rectangle',
        attrs: {
            body: {
                rx: 10,
                ry: 10,
                stroke: colors.shape
            }
        }
    },
    {
        type: 'standard.Circle',
        size: { width: 40, height: 40 },
        name: 'Circle',
        attrs: {
            body: {
                stroke: colors.shape
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 60, height: 40 },
        name: 'Ellipse',
        attrs: {
            body: {
                stroke: colors.shape
            }
        }
    },
    {
        // Triangle pointing up
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Triangle Up',
        attrs: {
            body: {
                d: 'M calc(0.5*w) 0 calc(w) calc(h) H 0 Z',
                stroke: colors.shape
            }
        }
    },
    {
        // Triangle pointing down
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Triangle Down',
        attrs: {
            body: {
                d: 'M 0 0 L calc(w) 0 calc(0.5*w) calc(h) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // Triangle with Curved Sides
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Triangle Curved',
        attrs: {
            body: {
                refD: null,
                d:
                    'M calc(w / 2) calc(h) L 0 calc(h / 2) A calc(w / 2) calc(h / 2) 0 0 1 calc(w / 2) 0 A calc(w / 2) calc(h / 2) 0 0 1 calc(w) calc(h / 2) Z',
                stroke: colors.shape
            }
        },
        keywords: ['triangle', 'curved']
    },
    {
        // Rhombus
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Rhombus',
        attrs: {
            body: {
                d:
                    'M calc(0.5*w) 0 calc(w) calc(0.5*h) calc(0.5*w) calc(h) 0 calc(0.5*h) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // Pentagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Pentagon',
        attrs: {
            body: {
                d: `
                      M calc(0.75*w) 0
                      L calc(w) calc(0.5*h)
                      L calc(0.5*w) calc(h)
                      L 0 calc(0.5*h)
                      L calc(0.25*w) 0
                      Z
                  `,
                stroke: colors.shape
            }
        }
    },
    {
        // Hexagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Hexagon',
        attrs: {
            body: {
                d:
                    'M 0 calc(0.5*h) L calc(0.25*w) 0 calc(0.75*w) 0 calc(w) calc(0.5*h) calc(0.75*w) calc(h) calc(0.25*w) calc(h) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // Octagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Octagon',
        attrs: {
            body: {
                d:
                    'M calc(0.3*w) 0 L calc(0.7*w) 0 calc(w) calc(0.3*h) calc(w) calc(0.7*h) calc(0.7*w) calc(h) calc(0.3*w) calc(h) 0 calc(0.7*h) 0 calc(0.3*h) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // Parallelogram
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Parallelogram',
        attrs: {
            body: {
                d: `
                      M calc(0.3*w) 0
                      L calc(w) 0
                      L calc(0.7*w) calc(h)
                      L 0 calc(h)
                      Z
                  `,
                stroke: colors.shape
            }
        }
    },
    {
        // Trapezoid
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Trapezoid',
        attrs: {
            body: {
                d: `
                      M calc(0.2*w) 0
                      L calc(0.8*w) 0
                      L calc(w) calc(h)
                      L 0 calc(h)
                      Z
                  `,
                stroke: colors.shape
            }
        }
    },
    {
        // Star
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        name: 'Star',
        attrs: {
            body: {
                d: `
                      M calc(0.5*w) 0
                      L calc(0.61*w) calc(0.25*h)
                      L calc(w) calc(0.3*h)
                      L calc(0.7*w) calc(0.5*h)
                      L calc(0.75*w) calc(0.79*h)
                      L calc(0.5*w) calc(0.65*h)
                      L calc(0.25*w) calc(0.79*h)
                      L calc(0.3*w) calc(0.5*h)
                      L 0 calc(0.3*h)
                      L calc(0.39*w) calc(0.25*h)
                      Z
                  `,
                stroke: colors.shape
            }
        }
    },
    {
        // Cross
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Cross',
        attrs: {
            body: {
                d: `
                      M calc(0.3*w) 0
                      L calc(0.7*w) 0
                      V calc(0.3*h)
                      L calc(w) calc(0.3*h)
                      L calc(w) calc(0.7*h)
                      H calc(0.7*w)
                      L calc(0.7*w) calc(h)
                      L calc(0.3*w) calc(h)
                      V calc(0.7*h)
                      L 0 calc(0.7*h)
                      L 0 calc(0.3*h)
                      H calc(0.3*w)
                      Z
                  `,
                stroke: colors.shape
            }
        }
    },
    {
        // Arrow
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Arrow',
        attrs: {
            body: {
                d: `
                      M 0 calc(0.5*h)
                      L calc(0.5*w) 0
                      L calc(w) calc(0.5*h)
                      L calc(0.8*w) calc(0.5*h)
                      L calc(0.8*w) calc(h)
                      L calc(0.2*w) calc(h)
                      L calc(0.2*w) calc(0.5*h)
                      Z
                  `,
                stroke: colors.shape
            }
        }
    },
    {
        // Pentagon with Curved Sides
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Pentagon Curved',
        attrs: {
            body: {
                d: `
                      M 0 calc(0.62*h)
                      Q calc(0.2*w) calc(0.15*h) calc(0.5*w) 0
                      Q calc(0.8*w) calc(0.15*h) calc(w) calc(0.62*h)
                      L calc(0.77*w) calc(h)
                      L calc(0.23*w) calc(h)
                      Z
                  `,
                stroke: colors.shape
            }
        }
    },
    {
        // Right-Angle Triangle
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'Triangle Right-Angle',
        attrs: {
            body: {
                strokeLinejoin: 'butt',
                d: 'M 0 calc(h) L calc(w) calc(h) L 0 0 Z',
                stroke: colors.shape
            }
        }
    },
    {
        // L-shape 1
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        name: 'L-shape 1',
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w/2) 0 L calc(w/2) calc(h/2) L calc(w) calc(h/2) L calc(w) calc(h) L 0 calc(h) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // L-shape 2
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        name: 'L-shape 2',
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w) 0 L calc(w) calc(h/2) L calc(w/2) calc(h/2) L calc(w/2) calc(h) L 0 calc(h) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // L-shape 3
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        name: 'L-shape 3',
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w) 0 L calc(w) calc(h) L calc(w/2) calc(h) L calc(w/2) calc(h/2) L 0 calc(h/2) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // L-shape 4
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        name: 'L-shape 4',
        attrs: {
            body: {
                d:
                    'M calc(w / 2) 0 L calc(w) 0 L calc(w) calc(h) L 0 calc(h) L 0 calc(h / 2) L calc(w / 2) calc(h / 2) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // U-shape 1
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'U-shape 1',
        attrs: {
            body: {
                d:
                    'M 0 0 calc(w / 3) 0 calc(w / 3) calc(h / 2) calc(2 * w / 3) calc(h / 2) calc(2 * w / 3) 0 calc(w) 0 calc(w) calc(h) 0 calc(h) Z',
                stroke: colors.shape
            }
        }
    },
    {
        // U-shape 2
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        name: 'U-shape 2',
        attrs: {
            body: {
                d:
                    'M 0 0 0 calc(h) calc(w / 3) calc(h) calc(w / 3) calc(h / 2) calc(2 * w / 3) calc(h / 2) calc(2 * w / 3) calc(h) calc(w) calc(h) calc(w) 0 Z',
                stroke: colors.shape
            }
        }
    }
];

const linksJSON = [
    {
        type: 'standard.Link',
        name: 'Link',
        attrs: {
            line: {
                stroke: colors.shape
            }
        }
    },
    {
        type: 'standard.DoubleLink',
        name: 'Outline Link',
        attrs: {
            line: {
                stroke: '#FFFFFF',
                targetMarker: {
                    stroke: colors.shape
                }
            },
            outline: {
                stroke: colors.shape
            }
        }
    },
    {
        type: 'standard.ShadowLink',
        name: 'Shadow Link',
        attrs: {
            line: {
                stroke: colors.shape
            }
        }
    }
];

const init = (rootEl) => {
    // Initiate the graph and the paper

    const graph = new dia.Graph({}, { cellNamespace: shapes });

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: shapes,
        width: '100%',
        height: '100%',
        gridSize: GRID_SIZE,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: colors.canvas }
    });
    rootEl.querySelector('.paper-container').append(paper.el);

    // Set mesh grid on paper when paper is attached so the dimensions are known.
    paper.setGrid('mesh');

    // Initiate the stencil

    const stencil = new ui.Stencil({
        paper: paper,
        width: '100%',
        height: '100%',
        usePaperGrid: true,
        paperOptions: () => {
            return {
                async: true,
                autoFreeze: true,
                sorting: dia.Paper.sorting.NONE,
                model: new dia.Graph({}, { cellNamespace: shapes }),
                cellViewNamespace: shapes,
                background: { color: colors.stencil }
            };
        },
        dragEndClone: (cell) => {
            const clone = cell.clone();
            const labelOffset = GRID_SIZE - 4;
            if (clone.isLink()) {
                clone.set('labels', [
                    {
                        attrs: {
                            labelText: {
                                text: 'Label',
                                textAnchor: 'middle',
                                textVerticalAnchor: 'top',
                                fontFamily: 'sans-serif',
                                fontSize: 12,
                                stroke: colors.canvas,
                                strokeWidth: 4,
                                paintOrder: 'stroke'
                            }
                        },
                        position: {
                            distance: 0.5,
                            offset: -labelOffset
                        },
                        markup: util.svg`
                    <text @selector="labelText" />
                `
                    }
                ]);
            } else {
                // cell is an element
                clone.attr('label', {
                    text: cell.get('name'),
                    refY: null,
                    y: -labelOffset,
                    textVerticalAnchor: 'top',
                    fontFamily: 'sans-serif',
                    fontSize: 12,
                    stroke: colors.canvas,
                    strokeWidth: 4,
                    paintOrder: 'stroke'
                });
            }
            // clean the name from the main graph model
            clone.unset('name');
            return clone;
        }
    });

    stencil.render();
    rootEl.querySelector('.stencil-container').appendChild(stencil.el);

    // Load the elements into the stencil

    function layoutStencilGroup(stencil, groupName) {
        const graph = stencil.getGraph(groupName);
        const paper = stencil.getPaper(groupName);
        // Position the elements in a grid layout.
        const layoutResult = layout.GridLayout.layout(graph.getElements(), {
            columns: 3,
            rowGap: SHAPES_GAP,
            columnGap: SHAPES_GAP,
            columnWidth: 'auto',
            rowHeight: 'auto'
        });
        // Position the links under the elements.
        // It's one link on per row.
        graph.getLinks().reduce((previousY, link) => {
            const linkY = previousY + 2 * SHAPES_GAP;
            link.source({ x: layoutResult.bbox.x, y: linkY });
            link.target({
                x: layoutResult.bbox.x + layoutResult.bbox.width,
                y: linkY
            });
            return linkY;
        }, layoutResult.bbox.y + layoutResult.bbox.height);

        // We want to fit the content of the paper
        // by the width of the stencil container only
        const fittingBBox = paper.getArea().clone();
        fittingBBox.height = Infinity;
        // Scale the paper, so the elements fit into the container
        // It does not change the size of the paper (which covers the whole stencil container)
        paper.transformToFitContent({
            padding: 10,
            useModelGeometry: true,
            fittingBBox
        });
    }

    stencil.load([...elementsJSON, ...linksJSON]);
    // Note: we don't use groups in this demo.
    layoutStencilGroup(stencil, null);

    // Initiate tooltips

    // We create a single tooltip paper that will be reused for all tooltips
    const tooltipGraph = new dia.Graph({}, { cellNamespace: shapes });
    const tooltipPaper = new dia.Paper({
        model: tooltipGraph,
        cellViewNamespace: shapes,
        width: 200,
        height: 120,
        async: true,
        autoFreeze: true,
        overflow: true,
        sorting: dia.Paper.sorting.NONE
    });

    const buildTooltipContent = (cell) => {
        // Add a copy of the cell to the tooltip graph
        // Note: We don't have to care about the position of the cell
        // because the tooltip paper will be transformed to fit the cell
        tooltipGraph.resetCells([cell.clone()]);

        const heading = document.createElement('h2');
        heading.append(document.createTextNode(cell.get('name')));

        const documentFragment = document.createDocumentFragment();
        documentFragment.append(tooltipPaper.el, heading);

        // We add an extra info about the size of the element
        if (cell.isElement()) {
            const { width, height } = cell.get('size');
            const descriptionText = `Size: ${width / GRID_SIZE} x ${height / GRID_SIZE
            }`;
            const description = document.createElement('p');
            description.append(document.createTextNode(descriptionText));
            documentFragment.append(description);
        }

        tooltipPaper.transformToFitContent({
            padding: 5,
            // Note: links can have 0 height
            // so we need to inflate the bbox a bit
            contentArea: cell.getBBox().inflate(1),
            verticalAlign: 'middle',
            horizontalAlign: 'middle'
        });

        return documentFragment;
    };

    let isDragging = false;

    const tooltip = new ui.Tooltip({
        target: '[model-id]',
        rootTarget: stencil.el,
        // Tooltip container denotes the area where the tooltip can be shown
        // It's adding a padding on the top and the bottom of the paper area.
        container: rootEl.querySelector('.tooltip-container'),
        content: (el) => {
            if (isDragging) {
                // Do not show tooltip when dragging an element
                return false;
            }
            const view = stencil.getPaper().findView(el);
            if (!view) {
                // The view should be always found
                return false;
            }
            return buildTooltipContent(view.model);
        },
        position: 'left',
        positionSelector: '.joint-stencil',
        padding: 10
    });

    stencil.on({
        'element:dragstart': () => {
            isDragging = true;
        },
        'element:dragend': () => {
            isDragging = false;
        }
    });

    return () => {
        // Clean up
        // Only views have to be removed from the DOM (to release the memory
        // from the event listeners and detached DOM elements)
        paper.remove();
        tooltip.remove();
        tooltipPaper.remove();
        stencil.remove();
    };
};

// eslint-disable-next-line no-unused-vars
const destroy = init(document.getElementById('app'));
// destroy(); // Call this function to clean up when needed
