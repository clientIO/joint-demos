import { dia, mvc, ui, shapes, util, layout, elementTools } from '@joint/plus';
import './styles.scss';

// Asset imports
import solidSvg from '../assets/icons/solid.svg';
import gradientSvg from '../assets/icons/gradient.svg';
import patternSvg from '../assets/icons/pattern.svg';

const StencilGroup = {
    Regular: 'regular',
    Irregular: 'irregular',
    Cubes: 'cubes'
};

// This is a custom stencil group label (an mvc.View) that allows to change the color and style of the group.
const StencilGroupLabel = mvc.View.extend(
    {
        colorPicker: null,
        stylePicker: null,

        events: {
            'click .pickers': 'onPickerClick'
        },

        style: {
            display: 'flex',
            justifyContent: 'space-between',
            textTransform: 'none',
            fontSize: '16px',
            alignItems: 'center',
            height: '100%'
        },

        init() {
            const { options, el } = this;

            // Label of the group
            const labelEl = document.createElement('span');
            labelEl.textContent = options.label;

            // Container for the color and style pickers
            const pickersEl = document.createElement('div');
            pickersEl.classList.add('pickers');
            pickersEl.style.display = 'flex';
            pickersEl.style.alignItems = 'center';

            const colorPicker = new ui.ColorPalette({
                theme: 'modern',
                options: [
                    { content: '#f6f6f6' },
                    { content: '#dcd7d7' },
                    { content: '#8f8f8f' },
                    { content: '#c6c7e2' },
                    { content: '#feb663' },
                    { content: '#fe854f' },
                    { content: '#b75d32' },
                    { content: '#31d0c6' },
                    { content: '#7c68fc' },
                    { content: '#61549c' },
                    { content: '#6a6c8a' },
                    { content: '#4b4a67' },
                    { content: '#3c4260' },
                    { content: '#33334e' },
                    { content: '#222138' }
                ]
            });

            const stylePicker = new ui.SelectBox({
                theme: 'modern',
                options: [
                    {
                        content: `<img src="${solidSvg}" width="20" height="20"><span class="style-label">Solid</span>`,
                        value: 'solid'
                    },
                    {
                        content: `<img src="${gradientSvg}" width="20" height="20"><span class="style-label">Gradient</span>`,
                        value: 'gradient'
                    },
                    {
                        content: `<img src="${patternSvg}" width="20" height="20"><span class="style-label">Pattern</span>`,
                        value: 'pattern'
                    }
                ]
            });

            el.appendChild(labelEl);
            el.appendChild(pickersEl);
            pickersEl.appendChild(stylePicker.el);
            pickersEl.appendChild(colorPicker.el);

            this.colorPicker = colorPicker;
            colorPicker.el.title = 'Select Color';
            colorPicker.render();
            // Re-trigger the `color:change` event on the group label
            colorPicker.on('option:select', (color) => {
                this.trigger('color:change', color.content);
            });

            this.stylePicker = stylePicker;
            stylePicker.el.title = 'Select Style';
            stylePicker.render();
            // Re-trigger the `style:change` event on the group label
            stylePicker.on('option:select', (style) => {
                this.trigger('style:change', style.value);
            });
        },

        onRemove() {
            // Clear the other views to avoid memory leaks
            this.colorPicker.remove();
            this.stylePicker.remove();
        },

        onPickerClick(evt) {
            // prevent the group from closing, when the button is clicked
            evt.stopPropagation();
        }
    },
    {
        create(label) {
            return new this({ label });
        }
    }
);

const regularJSON = [
    {
        type: 'standard.Rectangle',
        size: { width: 60, height: 40 },
        keywords: ['rect', 'rectangle']
    },
    {
        type: 'standard.Rectangle',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                rx: 10,
                ry: 10
            }
        },
        keywords: ['rounded', 'round', 'rectangle']
    },
    {
        type: 'standard.Circle',
        size: { width: 40, height: 40 },
        keywords: ['circle']
    },
    {
        type: 'standard.Ellipse',
        size: { width: 60, height: 40 },
        keywords: ['ellipse']
    },
    {
        // Triangle pointing up
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: 'M calc(0.5*w) 0 calc(w) calc(h) H 0 Z'
            }
        },
        keywords: ['triangle', 'up']
    },
    {
        // Triangle pointing down
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: 'M 0 0 L calc(w) 0 calc(0.5*w) calc(h) Z'
            }
        },
        keywords: ['triangle', 'down']
    },
    {
        // Rhombus
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M calc(0.5*w) 0 calc(w) calc(0.5*h) calc(0.5*w) calc(h) 0 calc(0.5*h) Z'
            }
        },
        keywords: ['rhombus']
    },
    {
        // Pentagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                M calc(0.75*w) 0
                L calc(w) calc(0.5*h)
                L calc(0.5*w) calc(h)
                L 0 calc(0.5*h)
                L calc(0.25*w) 0
                Z
            `
            }
        },
        keywords: ['pentagon']
    },
    {
        // Hexagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 calc(0.5*h) L calc(0.25*w) 0 calc(0.75*w) 0 calc(w) calc(0.5*h) calc(0.75*w) calc(h) calc(0.25*w) calc(h) Z'
            }
        },
        keywords: ['hexagon']
    },
    {
        // Octagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M calc(0.3*w) 0 L calc(0.7*w) 0 calc(w) calc(0.3*h) calc(w) calc(0.7*h) calc(0.7*w) calc(h) calc(0.3*w) calc(h) 0 calc(0.7*h) 0 calc(0.3*h) Z'
            }
        },
        keywords: ['octagon']
    },
    {
        // Parallelogram
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                M calc(0.3*w) 0
                L calc(w) 0
                L calc(0.7*w) calc(h)
                L 0 calc(h)
                Z
            `
            }
        },
        keywords: ['parallelogram']
    },
    {
        // Trapezoid
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                M calc(0.2*w) 0
                L calc(0.8*w) 0
                L calc(w) calc(h)
                L 0 calc(h)
                Z
            `
            }
        },
        keywords: ['trapezoid']
    },
    {
        // Right-Angle Triangle
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                strokeLinejoin: 'butt',
                d: 'M 0 calc(h) L calc(w) calc(h) L 0 0 Z'
            }
        },
        keywords: ['triangle', 'right-angle']
    }
];

const irregularJSON = [
    {
        // Arrow
        type: 'standard.Path',
        size: { width: 60, height: 40 },
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
                `
            }
        },
        keywords: ['arrow']
    },
    {
        // Pentagon with Curved Sides
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                    M 0 calc(0.62*h)
                    Q calc(0.2*w) calc(0.15*h) calc(0.5*w) 0
                    Q calc(0.8*w) calc(0.15*h) calc(w) calc(0.62*h)
                    L calc(0.77*w) calc(h)
                    L calc(0.23*w) calc(h)
                    Z
                `
            }
        },
        keywords: ['pentagon', 'curved']
    },
    {
        // Star
        type: 'standard.Path',
        size: { width: 40, height: 40 },
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
                `
            }
        },
        keywords: ['star']
    },
    {
        // Triangle with Curved Sides
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                refD: null,
                d:
                    'M calc(w / 2) calc(h) L 0 calc(h / 2) A calc(w / 2) calc(h / 2) 0 0 1 calc(w / 2) 0 A calc(w / 2) calc(h / 2) 0 0 1 calc(w) calc(h / 2) Z'
            }
        },
        keywords: ['triangle', 'curved']
    }
];

const cubesJSON = [
    {
        // L-shape 1
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w/2) 0 L calc(w/2) calc(h/2) L calc(w) calc(h/2) L calc(w) calc(h) L 0 calc(h) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // L-shape 2
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w) 0 L calc(w) calc(h/2) L calc(w/2) calc(h/2) L calc(w/2) calc(h) L 0 calc(h) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // L-shape 3
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w) 0 L calc(w) calc(h) L calc(w/2) calc(h) L calc(w/2) calc(h/2) L 0 calc(h/2) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // L-shape 4
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M calc(w / 2) 0 L calc(w) 0 L calc(w) calc(h) L 0 calc(h) L 0 calc(h / 2) L calc(w / 2) calc(h / 2) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // U-shape 1
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 calc(w / 3) 0 calc(w / 3) calc(h / 2) calc(2 * w / 3) calc(h / 2) calc(2 * w / 3) 0 calc(w) 0 calc(w) calc(h) 0 calc(h) Z'
            }
        },
        keywords: ['u-shape']
    },
    {
        // U-shape 2
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 0 calc(h) calc(w / 3) calc(h) calc(w / 3) calc(h / 2) calc(2 * w / 3) calc(h / 2) calc(2 * w / 3) calc(h) calc(w) calc(h) calc(w) 0 Z'
            }
        },
        keywords: ['u-shape']
    },
    {
        // Cross
        type: 'standard.Path',
        size: { width: 60, height: 40 },
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
                `
            }
        },
        keywords: ['cross']
    }
];

const init = () => {
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: shapes,
        width: '100%',
        height: '100%',
        gridSize: 1,
        async: true,
        clickThreshold: 10,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#dde6ed' },
        defaultConnectionPoint: {
            name: 'boundary',
            args: {
                selector: 'body'
            }
        },
        defaultLink: () =>
            new shapes.standard.Link({
                attrs: {
                    line: {
                        stroke: '#131e29'
                    }
                }
            }),
        linkPinning: false,
        highlighting: {
            connecting: {
                name: 'mask',
                options: {
                    attrs: {
                        stroke: '#0075f2',
                        'stroke-width': 2
                    }
                }
            }
        }
    });

    document.getElementById('paper-container').appendChild(paper.el);

    // Stencil

    const groupLabels = {
        [StencilGroup.Regular]: new StencilGroupLabel({ label: 'Regular' }),
        [StencilGroup.Irregular]: new StencilGroupLabel({ label: 'Irregular' }),
        [StencilGroup.Cubes]: new StencilGroupLabel({ label: 'Cubes' })
    };

    const stencil = new ui.Stencil({
        paper,
        usePaperGrid: true,
        width: 100,
        height: '100%',
        dropAnimation: true,
        paperOptions: () => {
            return {
                model: new dia.Graph({}, { cellNamespace: shapes }),
                cellViewNamespace: shapes,
                background: {
                    color: '#FFFFFF'
                },
                overflow: true
            };
        },
        search: (cell, keyword) => {
            if (keyword === '') return true;
            const keywords = cell.get('keywords') || [];
            return keywords.some(
                (kw) => kw.toLowerCase().indexOf(keyword.toLowerCase()) >= 0
            );
        },
        layout: (graph, group) => {
            const groupElements = graph.getElements();
            const rowGap = 20;
            const layoutOptions = {
                columns: 3,
                rowHeight: 'compact',
                columnWidth: 75,
                horizontalAlign: 'middle',
                rowGap,
                marginY: rowGap
            };
            layout.GridLayout.layout(groupElements, layoutOptions);
        },
        groups: {
            [StencilGroup.Regular]: {
                index: 1,
                label: groupLabels[StencilGroup.Regular].el
            },
            [StencilGroup.Irregular]: {
                index: 2,
                label: groupLabels[StencilGroup.Irregular].el
            },
            [StencilGroup.Cubes]: {
                index: 3,
                label: groupLabels[StencilGroup.Cubes].el
            }
        }
    });

    stencil.render();
    stencil.el.querySelector('.search').placeholder = 'Find shapes...';

    // Setup event listeners to change the color and style of the stencil shapes
    Object.keys(groupLabels).forEach((group) => {
        groupLabels[group].on('color:change', (color) =>
            updateStencilGroupColors(stencil, group, { color })
        );
        groupLabels[group].on('style:change', (style) =>
            updateStencilGroupColors(stencil, group, { style })
        );
    });

    document.getElementById('stencil-container').appendChild(stencil.el);

    stencil.load({
        [StencilGroup.Regular]: [...regularJSON],
        [StencilGroup.Cubes]: [...cubesJSON],
        [StencilGroup.Irregular]: [...irregularJSON]
    });

    // Set the initial color of the stencil elements
    updateStencilGroupColors(stencil, StencilGroup.Regular, { color: '#feb663' });
    updateStencilGroupColors(stencil, StencilGroup.Irregular, {
        color: '#fe854f'
    });
    updateStencilGroupColors(stencil, StencilGroup.Cubes, { color: '#b75d32' });

    // Set the color of the picker
    groupLabels[StencilGroup.Regular].colorPicker.selectByValue('#feb663');
    groupLabels[StencilGroup.Irregular].colorPicker.selectByValue('#fe854f');
    groupLabels[StencilGroup.Cubes].colorPicker.selectByValue('#b75d32');

    // Add remove button to the elements in the main paper

    paper.on('element:pointerclick', (elementView) => {
        paper.removeTools();
        const toolsView = new dia.ToolsView({
            tools: [
                new elementTools.Boundary({
                    useModelGeometry: true
                }),
                new elementTools.Connect({
                    useModelGeometry: true,
                    x: 'calc(w + 10)',
                    y: 'calc(h / 2)'
                }),
                new elementTools.Remove({
                    useModelGeometry: true,
                    x: -10,
                    y: -10
                })
            ]
        });
        elementView.addTools(toolsView);
    });

    paper.on('blank:pointerdown', () => {
        paper.removeTools();
    });

    return () => {
        // Clear the views
        paper.remove();
        stencil.remove();
        Object.keys(groupLabels).forEach((group) => {
            groupLabels[group].remove();
        });
    };
};

// eslint-disable-next-line no-unused-vars
const destroy = init();
// destroy();

// Functions

function lighten(color, percent) {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = f >> 16;
    const G = (f >> 8) & 0x00ff;
    const B = f & 0x0000ff;
    return (
        '#' +
        (
            0x1000000 +
            (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B)
        )
            .toString(16)
            .slice(1)
    );
}

function updateStencilGroupColors(stencil, group, options = {}) {
    const groupGraph = stencil.getGraph(group);
    const currentColor = groupGraph.get('color') || '#ffffff';
    const currentStyle = groupGraph.get('style') || 'solid';
    const {
        color = currentColor,
        style = currentStyle,
        colorShadesCount = 4
    } = options;
    groupGraph.set({ color, style });
    groupGraph.getElements().forEach((element, index) => {
        let shapeColor;
        switch (index % Math.min(colorShadesCount, 4)) {
            case 0:
                shapeColor = lighten(color, 0.1);
                break;
            case 1:
                shapeColor = lighten(color, 0.3);
                break;
            case 2:
                shapeColor = lighten(color, 0.5);
                break;
            case 3:
                shapeColor = lighten(color, 0.7);
                break;
        }

        switch (style) {
            case 'solid':
                element.attr('body', {
                    stroke: '#333',
                    fill: shapeColor
                });
                break;
            case 'gradient':
                element.attr(['body', 'stroke'], '#333');
                element.attr(
                    ['body', 'fill'],
                    {
                        type: 'linearGradient',
                        stops: [
                            { offset: '0%', color: shapeColor },
                            { offset: '100%', color }
                        ],
                        attrs: {
                            x1: '0%',
                            y1: '0%',
                            x2: '0%',
                            y2: '100%'
                        }
                    },
                    { rewrite: true }
                );
                break;
            case 'pattern':
                element.attr(['body', 'stroke'], color);
                element.attr(
                    ['body', 'fill'],
                    {
                        type: 'pattern',
                        attrs: {
                            width: 12,
                            height: 12,
                            'stroke-width': 3,
                            stroke: shapeColor,
                            fill: 'none'
                        },
                        markup: util.svg`
                    <rect width="12" height="12" fill="#fff" stroke="none" />
                    <path d="M 0 0 L 12 12 M 6 -6 L 18 6 M -6 6 L 6 18" />
                `
                    },
                    { rewrite: true }
                );
                break;
        }
    });
}
