import { dia, util, format, shapes, highlighters, elementTools, ui, V } from '@joint/plus';
import './styles.css';

// Asset imports
import assetFa_regular_400_woff2 from '../assets/fonts/fa-regular-400.woff2';
import assetFa_solid_900_woff2 from '../assets/fonts/fa-solid-900.woff2';
// Constants
// ---------

const colors = {
    red: '#ed2637',
    blue: '#0075f2',
    yellow: '#f6f740',
    green: '#1a2938',
    gray: '#cad8e3',
    dark: '#131e29',
    light: '#dde6ed',
    white: '#fff'
};

const fa = {
    dragon: '\uf6d5',
    dog: '\uf6d3',
    cat: '\uf6be',
    arrowDown: '\uf063',
    user: '\uf007',
    hourglass: '\uf252',
    repeat: '\uf021',
    linkArrow: '\uf359',
    heart: '\uf004',
    email: '\uf0e0',
    export: '\uf1c5',
    resize: '\uf065'
};

const faGroups = {
    faces: [0xf5c8, 0xf5c2, 0xf5b8, 0xf5c2, 0xf11a, 0xf119],
    files: [0xf1c6, 0xf1c8, 0xf1c4, 0xf15c, 0xf1c5, 0xf1c9],
    calendar: [0xf073, 0xf133, 0xf274],
    chess: [0xf43f, 0xf441, 0xf443, 0xf445, 0xf447, 0xf43a]
};

// Paper & Graph
// -------------

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    width: '100%',
    height: '100%',
    model: graph,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: {
        color: colors.light
    },
    linkPinning: false,
    validateConnection: () => false,
    defaultLink: () => new shapes.standard.Link(),
    defaultConnectionPoint: { name: 'boundary' },
    cellViewNamespace: shapes
});

document.getElementById('paper-container').appendChild(paper.el);
// Text with FontAwesome icons
// ---------------------------

const shape1 = new shapes.standard.Ellipse({
    size: {
        width: 120,
        height: 100
    },
    position: {
        x: 50,
        y: 20
    },
    attrs: {
        body: {
            fill: colors.white,
            stroke: colors.red
        },
        label: {
            text: `An example\nof FontAwesome\nicon ${fa.user} used\nin the text`,
            fontFamily: 'sans-serif',
            fontSize: 12,
            fill: colors.dark,
            lineHeight: 'auto',
            annotations: [
                {
                    start: 14,
                    end: 25,
                    attrs: {
                        fill: colors.blue,
                        'font-size': 13,
                        event: 'element:link:pointerdown',
                        'text-decoration': 'underline'
                    }
                },
                {
                    start: 31,
                    end: 32,
                    attrs: {
                        fill: colors.blue,
                        'font-family': 'FontAwesome',
                        'font-size': 20
                    }
                }
            ]
        }
    }
});

shape1.addTo(graph);

// Open a URL when the link in the text is clicked.
paper.on('element:link:pointerdown', (view, evt) => {
    evt.stopPropagation();
    openURL('https://fontawesome.com');
});

// Highlighters

const shape2 = new shapes.standard.HeaderedRectangle({
    size: {
        width: 200,
        height: 100
    },
    position: {
        x: 400,
        y: 100
    },
    attrs: {
        body: {
            fill: colors.white,
            stroke: colors.gray
        },
        header: {
            fill: colors.dark,
            stroke: colors.gray,
            strokeWidth: 1
        },
        headerText: {
            fill: colors.white,
            text: 'Highlighters',
            refX: null,
            x: 10,
            textAnchor: 'start',
            fontFamily: 'sans-serif'
        },
        bodyText: {
            text:
                'FontAwesome icons can be used in highlighters. Click on the icons in the top bar to toggle through them.\nThe icon on the left is also a custom highlighter.',
            fontFamily: 'sans-serif',
            textWrap: {
                width: -70,
                height: -30,
                ellipsis: true
            },
            fontSize: 10,
            fill: colors.dark,
            textAnchor: 'start',
            refX: null,
            x: 60
        }
    }
});

shape2.addTo(graph);

const FAImage = dia.HighlighterView.extend({
    tagName: 'text',
    attributes: {
        'font-family': 'FontAwesome',
        'font-size': 42,
        'font-weight': '900',
        // Move the vertical anchor of the text to the top.
        y: '.9em'
    },
    highlight() {
        const { charCode, x = 0, y = 0, color = 'black' } = this.options;
        this.el.textContent = String.fromCharCode(charCode);
        this.el.setAttribute('transform', `translate(${x}, ${y})`);
        this.el.setAttribute('fill', color);
    }
});
const FAList = highlighters.list.extend({
    createListItem({ charCode, group }, { height }, currentItemNode) {
        const { color = 'black' } = this.options;
        let itemNode = currentItemNode;
        if (!itemNode) {
            itemNode = document.createElementNS(V.namespace.svg, 'text');
            itemNode.classList.add('fa-list-item');
            itemNode.setAttribute('font-family', 'FontAwesome');
            itemNode.setAttribute('font-size', height);
            itemNode.setAttribute('fill', color);
            itemNode.setAttribute('y', '0.9em');
            itemNode.setAttribute('event', 'element:icon:pointerdown');
            itemNode.setAttribute('cursor', 'pointer');
        }
        // Update the item node
        itemNode.textContent = String.fromCharCode(charCode);
        itemNode.dataset.group = group;
        return itemNode;
    }
});

FAList.add(shape2.findView(paper), 'root', 'fa-highlighter-1', {
    attribute: 'icons',
    position: 'top-right',
    color: colors.gray,
    size: 15,
    gap: 5,
    margin: { top: 7, right: 5 }
});

FAImage.add(shape2.findView(paper), 'root', 'fa-highlighter-2', {
    charCode: 0xf1b2,
    color: colors.blue,
    x: 5,
    y: 35
});

shape2.set('icons', [
    {
        charCode: faGroups.faces[0],
        group: 'faces'
    },
    {
        charCode: faGroups.files[0],
        group: 'files'
    },
    {
        charCode: faGroups.calendar[0],
        group: 'calendar'
    },
    {
        charCode: faGroups.chess[0],
        group: 'chess'
    }
]);

// When the user clicks on the icon, toggle to the next one.
paper.on('element:icon:pointerdown', (view, evt) => {
    evt.stopPropagation();
    const { group, index } = evt.target.dataset;
    const faIcons = faGroups[group];
    const currentIndex = faIcons.indexOf(evt.target.textContent.charCodeAt(0));
    const nextIndex = (currentIndex + 1) % faIcons.length;
    const nextCharCode = faIcons[nextIndex];
    view.model.prop(['icons', Number(index), 'charCode'], nextCharCode);
});

// Links
// -----

// Link with FontAwesome icon as a label.
const link1 = new shapes.standard.Link({
    source: { x: 450, y: 300 },
    target: { x: 600, y: 350 },
    attrs: {
        line: {
            stroke: colors.dark
        }
    },
    labels: [
        {
            attrs: {
                text: {
                    fill: colors.dark,
                    text: 'Link Labels',
                    fontFamily: 'sans-serif'
                },
                rect: { fill: colors.light }
            },
            position: 0.3
        },

        {
            attrs: {
                text: {
                    fill: colors.blue,
                    text: fa.hourglass,
                    fontFamily: 'FontAwesome'
                },
                rect: { fill: colors.light }
            },
            position: 0.7
        }
    ]
});

link1.addTo(graph);

// Link with FontAwesome icon as the source and target marker.
const link2 = new shapes.standard.Link({
    source: { x: 400, y: 300 },
    target: { x: 500, y: 400 },
    attrs: {
        line: {
            stroke: colors.dark,
            sourceMarker: {
                markup: util.svg`
                    <text y="0.35em" fill="${colors.blue}" stroke="none" text-anchor="end" font-family="FontAwesome" font-weight="900" >${fa.repeat}</text>
                `
            },
            targetMarker: {
                markup: util.svg`
                    <text y="0.35em" fill="${colors.blue}" stroke="none" text-anchor="end" font-family="FontAwesome" font-weight="400" >${fa.linkArrow}</text>
                `
            }
        }
    },
    labels: [
        {
            attrs: {
                text: {
                    fill: colors.dark,
                    text: 'Link Markers',
                    fontFamily: 'sans-serif'
                },
                rect: { fill: colors.light }
            }
        }
    ]
});

link2.addTo(graph);

// Element & Link Tools
// --------------------

const LikeButton = elementTools.Button.extend({
    attributes: {
        cursor: 'pointer',
        class: 'fa-small-button'
    },
    children: util.svg`
        <circle fill="${colors.red}" r="12" />
        <text fill="${colors.light}" font-size="14" font-family="FontAwesome" font-weight="400" text-anchor="middle" x="0" y="5">${fa.heart}</text>
    `
});

const EmailButton = elementTools.Button.extend({
    attributes: {
        cursor: 'pointer',
        class: 'fa-small-button'
    },
    children: util.svg`
        <circle fill="${colors.red}" r="12" />
        <text fill="${colors.light}" font-size="14" font-family="FontAwesome" font-weight="400" text-anchor="middle" x="0" y="5">${fa.email}</text>
    `
});

const ExportButton = elementTools.Button.extend({
    attributes: {
        cursor: 'pointer',
        class: 'fa-button'
    },
    children: util.svg`
        <circle fill="${colors.white}" stroke="${colors.dark}" stroke-width="2" r="16" />
        <text fill="${colors.dark}" font-size="18" font-family="FontAwesome" font-weight="400" text-anchor="middle" x="0" y="0.3em">${fa.export}</text>
    `
});

const shape3 = new shapes.standard.Rectangle({
    position: { x: 100, y: 200 },
    size: { width: 200, height: 40 },
    attrs: {
        body: {
            fill: colors.white,
            stroke: colors.red,
            rx: 20,
            ry: 20
        },
        label: {
            text: '↑ Element Tools\nExport to PNG →',
            textAnchor: 'start',
            fontFamily: 'sans-serif',
            refX: null,
            x: 10
        }
    }
});

shape3.addTo(graph);

shape3.findView(paper).addTools(
    new dia.ToolsView({
        tools: [
            new LikeButton({
                x: 10,
                y: -20,
                action() {
                    openURL('https://github.com/clientIO/joint');
                }
            }),
            new EmailButton({
                x: 40,
                y: -20,
                action() {
                    openURL('mailto://org@client.io');
                }
            }),
            new ExportButton({
                x: 'calc(w - 20)',
                y: 20,
                action: () =>
                    // Export the paper content to PNG and show it in the lightbox
                    exportToPNG().then((dataURL) => {
                        const lightbox = new ui.Lightbox({
                            image: dataURL,
                            downloadable: true,
                            title: 'jointjs.png',
                            fileName: 'jointjs.png'
                        });
                        lightbox.open();
                    })
            })
        ]
    })
);

// Ports
// -----

const shape4 = new shapes.standard.Rectangle({
    size: {
        width: 120,
        height: 100
    },
    position: {
        x: 200,
        y: 300
    },
    attrs: {
        body: {
            fill: colors.light,
            stroke: colors.red,
            strokeDasharray: '5 2'
        },
        label: {
            text: 'Ports',
            refY: null,
            y: 5,
            textVerticalAnchor: 'top',
            fontFamily: 'sans-serif',
            fontSize: 20
        }
    },
    ports: {
        groups: {
            faCirclePortGroup: {
                position: 'bottom',
                markup: util.svg`
                    <circle @selector="portBackground" r="12" fill="${colors.dark}" stroke="${colors.light}" stroke-width="2"/>
                    <text @selector="portIcon" class="port-icon" font-family="FontAwesome" font-weight="900" y=".4em" font-size="15" fill="${colors.light}" text-anchor="middle"></text>
                `,
                size: { width: 20, height: 20 },
                attrs: {
                    portRoot: {
                        magnet: 'active',
                        highlighterSelector: 'portBackground',
                        magnetSelector: 'portBackground',
                        cursor: 'pointer'
                    }
                }
            },
            faRectPortGroup: {
                position: 'absolute',
                markup: util.svg`
                    <rect @selector="portBackground" fill="${colors.white}" stroke="${colors.dark}" stroke-width="2"/>
                    <text @selector="portIcon" class="port-icon" font-family="FontAwesome" font-weight="900" font-size="15" fill="${colors.dark}" text-anchor="end"></text>
                    <text @selector="portLabel" font-family="sans-serif" font-size="13" fill="${colors.dark}" text-anchor="start"></text>
                `,
                size: { width: 100, height: 20 },
                attrs: {
                    portRoot: {
                        magnet: 'active',
                        highlighterSelector: 'portBackground',
                        magnetSelector: 'portBackground',
                        cursor: 'pointer'
                    },
                    portBackground: {
                        width: 'calc(w)',
                        height: 'calc(h)'
                    },
                    portIcon: {
                        x: 'calc(w - 5)',
                        y: 'calc(h / 2 + 5)'
                    },
                    portLabel: {
                        x: 5,
                        y: 'calc(h / 2)',
                        textVerticalAnchor: 'middle'
                    }
                }
            }
        }
    }
});

shape4.addPorts([
    {
        id: 'port1',
        group: 'faCirclePortGroup',
        attrs: {
            portIcon: {
                text: fa.arrowDown,
                fill: colors.red
            }
        }
    },
    {
        id: 'port2',
        group: 'faCirclePortGroup',
        attrs: {
            portIcon: {
                text: fa.arrowDown,
                fill: colors.white
            }
        }
    },
    {
        id: 'port32',
        group: 'faCirclePortGroup',
        attrs: {
            portIcon: {
                text: fa.arrowDown,
                fill: colors.yellow
            }
        }
    },
    {
        id: 'port4',
        group: 'faRectPortGroup',
        args: {
            x: 10,
            y: 35
        },
        attrs: {
            portIcon: {
                text: fa.dog
            },
            portLabel: {
                text: 'Dog'
            }
        }
    },
    {
        id: 'port5',
        group: 'faRectPortGroup',
        args: {
            x: 10,
            y: 60
        },
        attrs: {
            portIcon: {
                text: fa.cat
            },
            portLabel: {
                text: 'Cat'
            }
        }
    }
]);

shape4.addTo(graph);

// Icon as a shape
// ---------------

const FAIconShape = dia.Element.define(
    'FAIconShape',
    {
        attrs: {
            body: {
                fontSize: 'calc(h)',
                x: 'calc(w / 2)',
                fontFamily: 'FontAwesome',
                fontWeight: '900',
                fill: 'black',
                textAnchor: 'middle'
            },
            label: {
                textVerticalAnchor: 'top',
                textAnchor: 'middle',
                x: 'calc(w / 2)',
                y: 'calc(h + 10)',
                fontSize: 14,
                fontFamily: 'sans-serif',
                fill: '#333333'
            }
        }
    },
    {
        markup: util.svg`
        <text @selector="body"/>
        <text @selector="label"/>
    `
    }
);

const shape5 = new FAIconShape({
    position: { x: 230, y: 30 },
    size: { width: 100, height: 100 },
    attrs: {
        body: {
            text: fa.dragon,
            fill: colors.blue
        },
        label: {
            text: 'Icon as a shape'
        }
    }
});

shape5.addTo(graph);

const ResizeTool = elementTools.Control.extend({
    children: util.svg`
        <text @selector="handle" cursor="nwse-resize" font-family="FontAwesome" font-weight="900" font-size="20" text-anchor="start" y="10" x="15">${fa.resize}</text>
    `,
    getPosition: function(view) {
        const model = view.model;
        const { width, height } = model.size();
        return { x: width, y: height };
    },
    setPosition: function(view, coordinates) {
        const model = view.model;
        const x = coordinates.x - 10;
        const y = coordinates.y - 10;
        const size = Math.max(Math.min(x, y), 10);
        model.resize(size, size);
    }
});

shape5.findView(paper).addTools(
    new dia.ToolsView({
        tools: [
            new ResizeTool({
                selector: 'body'
            })
        ]
    })
);

// Export
// ------

async function exportToPNG() {
    const fontURLs = [
        assetFa_regular_400_woff2,
        assetFa_solid_900_woff2
    ];

    return new Promise((resolve) => {
        Promise.all(
            fontURLs.map((url) => {
                return fetch(url).then((response) => {
                    return response.blob();
                });
            })
        ).then((blobs) => {
            Promise.all(
                blobs.map((blob) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    return new Promise((resolve) => {
                        reader.onload = function() {
                            resolve(reader.result);
                        };
                    });
                })
            ).then(([faRegularFont, faSolidFont]) => {
                format.toPNG(
                    paper,
                    (dataURL) => {
                        resolve(dataURL);
                    },
                    {
                        useComputedStyles: false,
                        backgroundColor: colors.light,
                        area: graph.getBBox().inflate(20),
                        stylesheet: `
                        @font-face {
                            font-family: 'FontAwesome';
                            font-style: normal;
                            font-weight: 400;
                            font-display: block;
                            src: url("${faRegularFont}") format("woff2");
                        }
                        @font-face {
                            font-family: 'FontAwesome';
                            font-style: normal;
                            font-weight: 900;
                            font-display: block;
                            src: url("${faSolidFont}") format("woff2");
                        }
                    `
                    }
                );
            });
        });
    });
}

// Helpers
// -------

function openURL(url) {
    window.open(url, '_blank');
}

// Zoom

paper.transformToFitContent({
    useModelGeometry: true,
    contentArea: graph.getBBox().inflate(50),
    verticalAlign: 'middle',
    horizontalAlign: 'middle'
});
