import { dia, ui, shapes, util, mvc } from '@joint/plus';
import './styles.scss';

// Asset imports
import jointjsLogoRedSvg from '../assets/jointjs-logo-red.svg';

// Assets now imported directly

import exitFullscreenIcon from '../assets/icons/exit-fullscreen.svg';
import fitToScreenIcon from '../assets/icons/fit-to-screen.svg';
import minimapIcon from '../assets/icons/minimap.svg';
import minimapOpenIcon from '../assets/icons/minimap-open.svg';
import requestFullscreenIcon from '../assets/icons/request-fullscreen.svg';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;

const colors = {
    blue: '#0075f2',
    red: '#ed2637',
    white: '#dde6ed',
    black: '#131e29',
    gray: '#cad8e3'
};

const containerEl = document.querySelector('#app');
const paperContainerEl = document.querySelector('.paper-container');
const floatingContainerEl = document.querySelector('.floating-container');

// A button with an icon and a tooltip for the toolbar

const IconButton = ui.widgets.button.extend({
    render: function() {
        const size = this.options.size || 24;
        const imageEl = document.createElement('img');
        imageEl.style.width = `${size}px`;
        imageEl.style.height = `${size}px`;
        this.el.appendChild(imageEl);
        this.setIcon(this.options.icon);
        this.setTooltip(this.options.tooltip);
        return this;
    },
    setIcon: function(icon = '') {
        this.el.querySelector('img').src = icon;
    },
    setTooltip: function(tooltip = '') {
        this.el.dataset.tooltip = tooltip;
    }
});

// Simplified navigator element view

const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
};

const NavigatorElementView = dia.ElementView.extend({
    body: null,
    markup: util.svg`<path @selector='body' fill='${colors.blue}' opacity='0.4' />`,
    // updates run on view initialization
    initFlag: [UpdateFlags.Render, UpdateFlags.Update, UpdateFlags.Transform],
    // updates run when the model attribute changes
    presentationAttributes: {
        position: [UpdateFlags.Transform],
        angle: [UpdateFlags.Transform],
        size: [UpdateFlags.Update], // shape
        navigatorType: [UpdateFlags.Update] // shape
    },
    // calls in an animation frame after a multiple changes
    // has been made to the model
    confirmUpdate: function(flags) {
        if (this.hasFlag(flags, UpdateFlags.Render)) this.render();
        if (this.hasFlag(flags, UpdateFlags.Update)) this.update();
        // using the original `updateTransformation()` method
        if (this.hasFlag(flags, UpdateFlags.Transform)) this.updateTransformation();
    },
    render: function() {
        const doc = util.parseDOMJSON(this.markup);
        this.body = doc.selectors.body;
        this.el.appendChild(doc.fragment);
    },
    update: function() {
        const { model, body } = this;
        // shape
        const { width, height } = model.size();
        const type = model.get('navigatorType');
        let d;
        switch (type) {
            case 'parallelogram':
                d = `M 20 0 H ${width} L ${width - 20} ${height} H 0 Z`;
                break;
            case 'diamond':
                d = `M 0 ${0.5 * height} ${0.5 * width} 0 ${width} ${0.5 * height} ${0.5 * width
                } ${height} Z`;
                break;
            case 'ellipse':
                d = `M ${0.5 * width} 0 A ${0.5 * width} ${0.5 * height} 0 1 0 ${0.5 * width
                } ${height} A ${0.5 * width} ${0.5 * height} 0 1 0 ${0.5 * width} 0 Z`;
                break;
            case 'rectangle':
            default:
                d = `M 0 0 H ${width} V ${height} H 0 Z`;
                break;
        }
        body.setAttribute('d', d);
    }
});

const NavigatorLinkView = dia.LinkView.extend({
    defaultTheme: null,
    initialize: function() {
        mvc.View.prototype.initialize.apply(this, arguments);
    },
    onMount: function() { },
    render: function() { },
    update: function() { }
});

// Paper

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: 1000,
    height: 500,
    gridSize: 10,
    background: {
        color: colors.white
    },
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    defaultLink: () => new shapes.standard.Link(),
    defaultConnectionPoint: { name: 'boundary' }
});

const scroller = new ui.PaperScroller({
    paper,
    autoResizePaper: true,
    cursor: 'grab',
    borderless: true
});

paperContainerEl.append(scroller.el);
scroller.center();

paper.on('paper:pinch', (evt, ox, oy, scale) => {
    evt.preventDefault();
    scroller.zoom(scale - 1, { min: MIN_ZOOM, max: MAX_ZOOM, ox, oy });
});

paper.on('paper:pan', (evt, tx, ty) => {
    evt.preventDefault();
    scroller.el.scrollLeft += tx;
    scroller.el.scrollTop += ty;
});

paper.on('blank:pointerdown', (evt) => {
    scroller.startPanning(evt);
});

// Floating toolbar

let navigator;

const toolbar = new ui.Toolbar({
    autoToggle: true,
    references: {
        paperScroller: scroller
    },
    tools: [
        {
            type: 'icon-button',
            name: 'fullscreen'
            /* icon and tooltip are set in updateToolbarButtons() */
        },
        {
            type: 'icon-button',
            name: 'fit-to-screen',
            icon: fitToScreenIcon,
            tooltip: 'Fit to screen'
        },
        { type: 'separator' },
        {
            type: 'zoom-slider',
            min: MIN_ZOOM * 100,
            max: MAX_ZOOM * 100,
            attrs: { input: { 'data-tooltip': 'Slide to zoom' }}
        },
        { type: 'separator' },
        {
            type: 'icon-button',
            name: 'minimap'
            /* icon and tooltip are set in updateToolbarButtons() */
        }
    ],
    widgetNamespace: {
        ...ui.widgets,
        iconButton: IconButton
    }
});

toolbar.render();
updateToolbarButtons();
floatingContainerEl.appendChild(toolbar.el);

toolbar.on('fit-to-screen:pointerclick', fitToScreen);
toolbar.on('fullscreen:pointerclick', toggleFullscreen);
toolbar.on('minimap:pointerclick', toggleMinimap);

document.addEventListener('fullscreenchange', updateToolbarButtons);

// Tooltip

// eslint-disable-next-line no-unused-vars
const tooltip = new ui.Tooltip({
    rootTarget: toolbar.el,
    container: containerEl,
    target: '[data-tooltip]',
    direction: 'bottom',
    position: 'top',
    positionSelector: '.joint-toolbar',
    padding: 10
});

// Functions

function fitToScreen() {
    scroller.zoomToFit({ useModelGeometry: true, padding: 20 });
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

function showMinimap() {
    navigator = new ui.Navigator({
        paperScroller: scroller,
        width: 260,
        height: 130,
        padding: 10,
        zoom: false,
        useContentBBox: true,
        paperOptions: {
            async: true,
            sorting: dia.Paper.sorting.APPROX,
            elementView: NavigatorElementView,
            linkView: NavigatorLinkView,
            cellViewNamespace: {},
            background: {
                color: 'transparent'
            }
        }
    });
    floatingContainerEl.prepend(navigator.el);
    navigator.render();
}

function hideMiniMap() {
    if (!navigator) return;
    navigator.remove();
    navigator = null;
}

function toggleMinimap() {
    if (navigator) {
        hideMiniMap();
    } else {
        showMinimap();
    }
    updateToolbarButtons();
}

function updateToolbarButtons() {
    // Minimap
    const minimapButton = toolbar.getWidgetByName('minimap');
    if (navigator) {
        minimapButton.setIcon(minimapOpenIcon);
        minimapButton.setTooltip('Hide minimap');
    } else {
        minimapButton.setIcon(minimapIcon);
        minimapButton.setTooltip('Show minimap');
    }
    // Full screen
    const fullscreenButton = toolbar.getWidgetByName('fullscreen');
    if (document.fullscreenElement) {
        fullscreenButton.setIcon(exitFullscreenIcon);
        fullscreenButton.setTooltip('Exit full screen');
    } else {
        fullscreenButton.setIcon(requestFullscreenIcon);
        fullscreenButton.setTooltip('Toggle full screen');
    }
}

// Example

const json = {
    cells: [
        {
            type: 'standard.Ellipse',
            position: {
                x: 70,
                y: 40
            },
            size: {
                width: 60,
                height: 60
            },
            angle: 0,
            id: 'r3',
            navigatorType: 'ellipse',
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: '#dde6ed',
                    rx: 20,
                    ry: 20
                },
                label: {
                    text: 'Start',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Path',
            position: {
                x: 50,
                y: 140
            },
            size: {
                width: 100,
                height: 60
            },
            angle: 0,
            id: 'p2',
            navigatorType: 'parallelogram',
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: '#dde6ed',
                    d: 'M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z'
                },
                label: {
                    text: 'Input',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Path',
            position: {
                x: 50,
                y: 240
            },
            size: {
                width: 100,
                height: 100
            },
            angle: 0,
            id: 'p1',
            navigatorType: 'diamond',
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: '#dde6ed',
                    d:
                        'M 0 calc(0.5 * h) calc(0.5 * w) 0 calc(w) calc(0.5 * h) calc(0.5 * w) calc(h) Z'
                },
                label: {
                    text: 'Decision',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Rectangle',
            position: {
                x: 210,
                y: 380
            },
            size: {
                width: 100,
                height: 60
            },
            angle: 0,
            id: 'r4',
            navigatorType: 'rectangle',
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: '#dde6ed'
                },
                label: {
                    text: 'Process',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 350,
                y: 380
            },
            size: {
                width: 60,
                height: 60
            },
            angle: 0,
            id: 'e1',
            navigatorType: 'ellipse',
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: '#dde6ed'
                },
                label: {
                    text: 'End',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Link',
            source: {
                id: 'r3'
            },
            target: {
                id: 'p2'
            },
            id: 'l1',
            attrs: {}
        },
        {
            type: 'standard.Link',
            source: {
                id: 'p2'
            },
            target: {
                id: 'p1'
            },
            id: 'l2',
            attrs: {}
        },
        {
            type: 'standard.Link',
            source: {
                id: 'p1'
            },
            target: {
                id: 'r4'
            },
            id: 'l3',
            vertices: [
                {
                    x: 100,
                    y: 410
                }
            ],
            labels: [
                {
                    attrs: {
                        text: {
                            text: 'Yes',
                            fontFamily: 'sans-serif'
                        },
                        rect: {
                            fill: '#dde6ed'
                        }
                    }
                }
            ],
            attrs: {}
        },
        {
            type: 'standard.Link',
            source: {
                id: 'p1'
            },
            target: {
                id: 'p2'
            },
            id: 'l4',
            vertices: [
                {
                    x: 190,
                    y: 290
                },
                {
                    x: 190,
                    y: 170
                }
            ],
            labels: [
                {
                    attrs: {
                        text: {
                            text: 'No',
                            fontFamily: 'sans-serif'
                        },
                        rect: {
                            fill: '#dde6ed'
                        }
                    }
                }
            ],
            attrs: {}
        },
        {
            type: 'standard.Link',
            source: {
                id: 'r4'
            },
            target: {
                id: 'e1'
            },
            id: 'l5',
            attrs: {}
        },
        {
            type: 'standard.HeaderedRectangle',
            position: {
                x: 830,
                y: -10
            },
            size: {
                width: 420,
                height: 530
            },
            angle: 0,
            id: 'e38c0182-4883-4bc5-ba35-7257e02962f0',
            z: 1,
            embeds: [
                '0ce4897a-881c-4673-ab3d-6e4b91e08992',
                '279c3134-fae6-4c4c-a34d-0441611ad10e',
                'c11b59b1-d242-4474-898f-fee5e233e1b8',
                'e3a2d0f4-27e3-4757-8386-090cba0ed1ba'
            ],
            attrs: {
                body: {
                    stroke: '#131e29',
                    fill: '#131e29',
                    opacity: 0.2
                },
                header: {
                    stroke: '#131e29',
                    fill: '#131e29'
                },
                headerText: {
                    fill: '#dde6ed',
                    text: 'Package 1',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.HeaderedRectangle',
            position: {
                x: 980,
                y: 50
            },
            size: {
                width: 240,
                height: 170
            },
            angle: 0,
            id: 'e3a2d0f4-27e3-4757-8386-090cba0ed1ba',
            z: 2,
            embeds: [
                '28f4877b-9551-4f46-866f-d0ea32fef64e',
                '4bd4b9cf-be84-4abb-9a78-5fba3adb140d'
            ],
            parent: 'e38c0182-4883-4bc5-ba35-7257e02962f0',
            attrs: {
                body: {
                    stroke: '#131e29',
                    fill: '#131e29',
                    opacity: 0.2
                },
                header: {
                    stroke: '#131e29',
                    fill: '#131e29'
                },
                headerText: {
                    fill: '#dde6ed',
                    text: 'Package 2',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 860,
                y: 110
            },
            size: {
                width: 80,
                height: 80
            },
            angle: 0,
            navigatorType: 'ellipse',
            id: '0ce4897a-881c-4673-ab3d-6e4b91e08992',
            z: 3,
            parent: 'e38c0182-4883-4bc5-ba35-7257e02962f0',
            attrs: {
                body: {
                    stroke: 'none',
                    fill: '#dde6ed'
                },
                label: {
                    fill: '#ed2637',
                    text: 'Module 1',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 860,
                y: 410
            },
            size: {
                width: 80,
                height: 80
            },
            angle: 0,
            navigatorType: 'ellipse',
            id: '279c3134-fae6-4c4c-a34d-0441611ad10e',
            z: 4,
            parent: 'e38c0182-4883-4bc5-ba35-7257e02962f0',
            attrs: {
                body: {
                    stroke: 'none',
                    fill: '#ed2637'
                },
                label: {
                    fill: '#dde6ed',
                    text: 'Module 2',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 1010,
                y: 410
            },
            size: {
                width: 80,
                height: 80
            },
            angle: 0,
            navigatorType: 'ellipse',
            id: 'c11b59b1-d242-4474-898f-fee5e233e1b8',
            z: 5,
            parent: 'e38c0182-4883-4bc5-ba35-7257e02962f0',
            attrs: {
                body: {
                    stroke: 'none',
                    fill: '#ed2637'
                },
                label: {
                    fill: '#dde6ed',
                    text: 'Module 3',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 1010,
                y: 110
            },
            size: {
                width: 80,
                height: 80
            },
            angle: 0,
            navigatorType: 'ellipse',
            id: '28f4877b-9551-4f46-866f-d0ea32fef64e',
            z: 6,
            parent: 'e3a2d0f4-27e3-4757-8386-090cba0ed1ba',
            attrs: {
                body: {
                    stroke: 'none',
                    fill: '#ed2637'
                },
                label: {
                    fill: '#dde6ed',
                    text: 'Module 4',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Ellipse',
            position: {
                x: 1110,
                y: 110
            },
            size: {
                width: 80,
                height: 80
            },
            angle: 0,
            navigatorType: 'ellipse',
            id: '4bd4b9cf-be84-4abb-9a78-5fba3adb140d',
            z: 7,
            parent: 'e3a2d0f4-27e3-4757-8386-090cba0ed1ba',
            attrs: {
                body: {
                    stroke: 'none',
                    fill: '#ed2637'
                },
                label: {
                    fill: '#dde6ed',
                    text: 'Module 5',
                    fontFamily: 'sans-serif'
                }
            }
        },
        {
            type: 'standard.Link',
            source: {
                type: 'standard.Ellipse',
                position: {
                    x: 980,
                    y: 620
                },
                size: {
                    width: 80,
                    height: 80
                },
                angle: 0,
                navigatorType: 'ellipse',
                id: '0ce4897a-881c-4673-ab3d-6e4b91e08992',
                z: 3,
                parent: 'e38c0182-4883-4bc5-ba35-7257e02962f0',
                attrs: {
                    body: {
                        stroke: 'none',
                        fill: '#dde6ed'
                    },
                    label: {
                        fill: '#ed2637',
                        text: 'Module 1',
                        fontFamily: 'sans-serif'
                    }
                }
            },
            target: {
                type: 'standard.Ellipse',
                position: {
                    x: 980,
                    y: 920
                },
                size: {
                    width: 80,
                    height: 80
                },
                angle: 0,
                navigatorType: 'ellipse',
                id: '279c3134-fae6-4c4c-a34d-0441611ad10e',
                z: 4,
                parent: 'e38c0182-4883-4bc5-ba35-7257e02962f0',
                attrs: {
                    body: {
                        stroke: 'none',
                        fill: '#ed2637'
                    },
                    label: {
                        fill: '#dde6ed',
                        text: 'Module 2',
                        fontFamily: 'sans-serif'
                    }
                }
            },
            id: '5df8d997-1814-4e67-a713-ae75753ba540',
            z: 8,
            attrs: {}
        },
        {
            type: 'standard.BorderedImage',
            position: {
                x: 1530,
                y: -340
            },
            size: {
                width: 400,
                height: 300
            },
            angle: 0,
            id: '7089ca15-fbde-4fd1-99b3-160ae7b0caef',
            z: 9,
            attrs: {
                border: {
                    stroke: '#0075f2'
                },
                background: {
                    fill: '#dde6ed'
                },
                image: {
                    xlinkHref: jointjsLogoRedSvg
                }
            }
        }
    ]
};

graph.fromJSON(json);

const startElement = graph.getCell('r3');
const subgraphBBox = graph.getCellsBBox([
    startElement,
    ...graph.getSuccessors(startElement)
]);
scroller.zoomToRect(subgraphBBox, { padding: 100 });
