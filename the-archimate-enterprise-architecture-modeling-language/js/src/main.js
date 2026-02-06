// The example and `ArchiMate` expertise provided by Goodea (https://goodea.eu/).

import {
    dia,
    ui,
    util,
    highlighters,
    shapes as defaultShapes,
    elementTools,
    linkTools,
    connectionStrategies,
    anchors
} from '@joint/plus';
import './styles.scss';

// Assets now imported directly

import actorIconSvg from '../assets/icons/actor-icon.svg';
import actorSvg from '../assets/icons/actor.svg';
import objectSvg from '../assets/icons/object.svg';
import processSvg from '../assets/icons/process.svg';

const color = '#FFFD77';
const borderColor = '#333333';
const textColor = '#000000';
const thickness = 2;
const linkColor = '#333333';
const bgColor = '#F3F7F6';
const hglColor = '#008DD5';
const behaviorElementRadius = 10;
const defaultResizeOptions = {
    deep: true,
    padding: { horizontal: 20, bottom: 20, top: 40 }
};
const hglOptions = {
    padding: 2,
    attrs: {
        stroke: hglColor,
        'stroke-width': 2
    }
};

const HitArea = dia.HighlighterView.extend({
    tagName: 'rect',
    MOUNTABLE: false,
    attributes: {
        fill: 'transparent'
        // DEBUG
        // fill: 'red',
    },
    highlight(elementView) {
        const { top = 0, left = 0, bottom = 0, right = 0 } = this.options;
        const { width, height } = elementView.model.size();
        this.el.setAttribute('x', -left);
        this.el.setAttribute('y', -top);
        this.el.setAttribute('width', left + width + right);
        this.el.setAttribute('height', top + height + bottom);
        elementView.el.prepend(this.el);
    }
});

const Link = dia.Link.define(
    'Link',
    {
        attrs: {
            root: {
                highlighterSelector: 'line'
            },
            line: {
                connection: true,
                stroke: linkColor,
                strokeWidth: thickness,
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -5 0 0 10 5 z'
                }
            },
            outline: {
                connection: true,
                strokeWidth: thickness + 2,
                strokeLinejoin: 'round',
                stroke: bgColor
            },
            wrapper: {
                connection: true,
                strokeWidth: 10,
                strokeLinejoin: 'round'
            }
        }
    },
    {
        markup: util.svg/*xml*/ `
          <path @selector="wrapper" fill="none" cursor="pointer" stroke="transparent" stroke-linecap="round"  stroke-linejoin="round" />
          <path @selector="outline" fill="none" pointer-events="none" />
          <path @selector="line" fill="none" pointer-events="none" />
      `
    }
);

function getConstructorFromType(type) {
    switch (type) {
        case 'BusinessActor':
            return BusinessActor;
        case 'BusinessObject':
            return BusinessObject;
        case 'BusinessProcess':
            return BusinessProcess;
        default:
            return Container;
    }
}

const Icon = dia.Element.define(
    'Icon',
    {
        attrs: {
            root: {
                cursor: 'move'
            }
        }
    },
    {
        isBehaviorElement() {
            return false;
        },

        getNextVisual() {
            return Container.fromIcon(this);
        }
    },
    {
        fromContainer: function(container) {
            const ctor = getConstructorFromType(container.get('amType'));
            return new ctor({
                attrs: {
                    label: {
                        text: container.attr('label/text')
                    }
                }
            });
        }
    }
);

// The size of the model is larger than the size of the icon.
// This is because we want to have some space around the icon
// when its embedded into a container.
const BusinessActor = Icon.define(
    'BusinessActor',
    {
        amType: 'BusinessActor',
        size: { width: 100, height: 80 },
        attrs: {
            root: {
                magnetSelector: 'icon',
                highlighterSelector: 'icon'
            },
            icon: {
                class: 'jj-shape-outline',
                y: 24,
                x: 20,
                width: 'calc(w - 40)',
                height: 'calc(h - 24)',
                href: actorIconSvg
            },
            label: {
                text: 'Business Actor',
                fill: textColor,
                textAnchor: 'middle',
                textVerticalAnchor: 'bottom',
                x: 'calc(w / 2)',
                y: 20,
                fontSize: 12,
                fontFamily: 'Arial',
                textWrap: {
                    width: 'calc(w)',
                    height: null,
                    ellipsis: true
                }
            }
        }
    },
    {
        markup: util.svg/*xml*/ `
          <text @selector="label" />
          <image @selector="icon" />
      `,

        iconURL: actorSvg
    }
);

const BusinessObject = Icon.define(
    'BusinessObject',
    {
        amType: 'BusinessObject',
        size: { width: 80, height: 60 },
        attrs: {
            root: {
                magnetSelector: 'body',
                highlighterSelector: 'body'
            },
            body: {
                class: 'jj-shape-outline',
                fill: color,
                stroke: borderColor,
                strokeWidth: thickness,
                d: 'M 0 0 H calc(w) V calc(h) H 0 Z M 0 0 H calc(w) V 20 H 0 Z'
            },
            label: {
                text: 'Business Object',
                fill: textColor,
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
                x: 'calc(w / 2)',
                y: 'calc(h / 2 + 10)',
                fontSize: 12,
                fontFamily: 'Arial',
                textWrap: {
                    width: 'calc(w - 10)',
                    height: 'calc(h - 30)',
                    ellipsis: true
                }
            }
        }
    },
    {
        markup: util.svg/*xml*/ `
          <path @selector="body" />
          <text @selector="label" />
      `,

        iconURL: objectSvg
    }
);

const BusinessProcess = Icon.define(
    'BusinessProcess',
    {
        amType: 'BusinessProcess',
        size: { width: 100, height: 60 },
        attrs: {
            root: {
                magnetSelector: 'body',
                highlighterSelector: 'body'
            },
            body: {
                class: 'jj-shape-outline',
                fill: color,
                stroke: borderColor,
                strokeWidth: thickness,
                d:
                    'M 0 calc(h/4) H calc(w-30) V 0 L calc(w) calc(h/2) calc(w-30) calc(h) V calc(3*h/4) H 0 Z'
            },
            label: {
                text: 'Business Process',
                fill: textColor,
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
                x: 'calc(w / 2)',
                y: 'calc(h / 2)',
                fontSize: 12,
                fontFamily: 'Arial',
                textWrap: {
                    width: 'calc(w - 30)',
                    height: 'calc(h - 30)',
                    ellipsis: true
                }
            }
        }
    },
    {
        markup: util.svg/*xml*/ `
          <path @selector="body" />
          <text @selector="label" />
      `,

        iconURL: processSvg,

        isBehaviorElement() {
            return true;
        }
    }
);

const Container = dia.Element.define(
    'Container',
    {
        size: { width: 160, height: 80 },
        attrs: {
            root: {
                magnetSelector: 'body',
                highlighterSelector: 'body',
                cursor: 'move'
            },
            body: {
                class: 'jj-shape-outline',
                fill: color,
                stroke: borderColor,
                strokeWidth: thickness,
                width: 'calc(w)',
                height: 'calc(h)'
            },
            label: {
                text: 'rect',
                fill: textColor,
                textAnchor: 'middle',
                textVerticalAnchor: 'top',
                x: 'calc(w / 2)',
                y: 5,
                fontSize: 12,
                fontFamily: 'Arial',
                textWrap: {
                    width: 'calc(w - 60)'
                }
            },
            icon: {
                class: 'jj-shape-icon',
                width: 25,
                height: 25,
                x: 'calc(w - 30)',
                y: 5
            }
        }
    },
    {
        markup: util.svg/*xml*/ `
          <rect @selector="body" />
          <text @selector="label" />
          <image @selector="icon" />
      `,

        getNextVisual() {
            const ctor = getConstructorFromType(this.get('amType'));
            return ctor.fromContainer(this);
        }
    },
    {
        isContainer(element) {
            return element.get('type') === 'Container';
        },

        fromIcon(icon) {
            const cornerRadius = icon.isBehaviorElement() ? behaviorElementRadius : 0;
            const container = new Container({
                amType: icon.get('amType'),
                attrs: {
                    body: {
                        rx: cornerRadius,
                        ry: cornerRadius
                    },
                    label: {
                        text: icon.attr('label/text')
                    },
                    icon: {
                        href: icon.iconURL
                    }
                }
            });
            return container;
        }
    }
);

const shapes = {
    ...defaultShapes,
    Link,
    Icon,
    BusinessActor,
    BusinessObject,
    BusinessProcess,
    Container
};

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 5,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: bgColor },
    // We enabled the embedding mode to let JointJS deal
    // with fixing the `z` order of elements
    // But we made all validations fail. We do the embedding ourselves
    // on `element:pointerup` event (we want to be able to cancel the embedding
    // if the user doesn't select any relationship type)
    embeddingMode: true,
    validateEmbedding: () => false,
    validateConnection: (
        cellViewS,
        magnetS,
        cellViewT,
        magnetT,
        end,
        linkView
    ) => {
        if (cellViewS === cellViewT) return false;
        const source = cellViewS.model;
        const target = cellViewT.model;
        if (source.isLink() || target.isLink()) return false;
        const relationshipTypes = getValidRelationships(source, target, 'link');
        if (relationshipTypes.length === 0) return false;
        return true;
    },
    linkPinning: false,
    defaultRouter: {
        name: 'orthogonal',
        args: {
            // Make space for the arrowheads
            padding: 30
        }
    },
    defaultConnectionPoint: {
        name: 'boundary',
        args: {
            offset: 5
        }
    },
    defaultAnchor: (view, magnet, ref, opt, endType, linkView) => {
        if (endType === 'source') {
            return anchors.modelCenter.call(
                linkView,
                view,
                magnet,
                ref,
                opt,
                endType,
                linkView
            );
        } else {
            return anchors.perpendicular.call(
                linkView,
                view,
                magnet,
                ref,
                opt,
                endType,
                linkView
            );
        }
    },
    highlighting: {
        connecting: {
            name: 'mask',
            options: hglOptions
        }
    },
    viewport: (view) => {
        if (view.model.isLink()) {
            const link = view.model;
            const source = link.getSourceCell();
            const target = link.getTargetCell();
            if (!source || !target) return true;
            if (source.isEmbeddedIn(target)) return false;
            if (target.isEmbeddedIn(source)) return false;
            return true;
        }
        return true;
    },
    defaultLink: () =>
        new shapes.standard.Link({
            attrs: {
                line: {
                    class: 'tmp-link',
                    stroke: hglColor
                }
            }
        }),
    connectionStrategy: (end, endView, endMagnet, coords, link, endType) => {
        if (endType === 'source') return end;
        end.connectionPoint = { name: 'anchor' };
        return connectionStrategies.pinAbsolute(
            end,
            endView,
            endMagnet,
            coords,
            link,
            endType
        );
    }
});

document.getElementById('paper-container').appendChild(paper.el);

const commandManager = new dia.CommandManager({
    graph
});

const toolbar = new ui.Toolbar({
    tools: [
        { type: 'undo', text: '↩' },
        { type: 'redo', text: '↪' },
        { type: 'button', name: 'help', text: '﹖ Help' }
    ],
    references: {
        commandManager
    },
    autoToggle: true
});

document.getElementById('toolbar-container').appendChild(toolbar.el);
toolbar.render();

toolbar.on('help:pointerdown', () => {
    const helpDialog = new ui.Dialog({
        content: /* html */ `
              <h3>The ArchiMate® Enterprise Architecture Modeling Language</h3>
              <h4>What is it?</h4>
              <p>
                  <a href="https://www.opengroup.org/archimate-forum/archimate-overview" target="_blank">ArchiMate</a> is an enterprise architecture modeling language that provides a framework for describing, analyzing, and visualizing the relationships among business domains in an enterprise.
              </p>
              <p>
                  This example shows only a subset of the <i>ArchiMate</i> language. Specifically, it is the <b>Business Layer</b>, which is one of the three layers of the language.
                  <br>
                  The <i>Business Layer</i> describes the organizational structure of an enterprise at the level of business units and their internal collaborations.
              </p>
              <h4>How to use it?</h4>
              <p>
                  <style>
                      li { margin: 10px; }
                      li i { color: ${hglColor}; }
                  </style>
                  <ul>
                      <li>You can add new elements to the diagram by right-clicking on the canvas and selecting the element type from the context menu
                          (the example implements only three element types: <i>Business Actor</i>, <i>Business Object</i>, and <i>Business Process</i>).
                      </li>
                      <li>You can connect two elements by:
                          <ul>
                              <li>dragging the connection icon (<span style="color:white;background:${hglColor};margin:2px;">⮕</span>) of one element to the other element (and create an <i>explicit</i> connection).
                          </li>
                              <li>dragging an element onto another element (and create an <i>implicit</i> connection).</li>
                          </ul>
                          The type of connection is to be selected from the context menu immediately after connecting the element.
                      </li>
                      <li>You can switch between the <i>implicit</i> and <i>explicit</i> connections by embedding/unembedding the elements into/from containers.</li>
                      <li>You can right-click on an element to open the context menu to:
                          <ul>
                              <li>Change the <i>visual</i> of the element (each element can be represented in two ways).</li>
                              <li>Delete the element.</li>
                              <li>Resize the container.</li>
                          </ul>
                      </li>
                      <li>You can right-click on a link to open the context menu to delete the link.</li>
                  </ul>

              </p>

              <i>The example and expertise provided by <a href="https://goodea.eu/" target="_blank">Goodea</a>.</i>
          `
    });
    helpDialog.open();
});

// eslint-disable-next-line no-unused-vars
const snaplines = new ui.Snaplines({
    theme: 'material',
    filter: ['Container'],
    paper
});

const relationshipTemplates = {
    assignment: new Link({
        amType: 'assignment',
        attrs: {
            line: {
                strokeWidth: thickness,
                sourceMarker: {
                    type: 'circle',
                    r: 2
                },
                targetMarker: {
                    type: 'circle',
                    r: 2
                }
            }
        }
    }),
    access: new Link({
        amType: 'access',
        attrs: {
            line: {
                strokeWidth: thickness,
                strokeDasharray: '3 3',
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -5 0 0 10 5 4 0 z'
                }
            }
        }
    }),
    aggregation: new Link({
        amType: 'aggregation',
        attrs: {
            line: {
                strokeWidth: thickness,
                targetMarker: {
                    type: 'path',
                    fill: 'white',
                    'stroke-width': 2,
                    d: 'M 10 -5 0 0 10 5 20 0 z'
                }
            }
        }
    }),
    composition: new Link({
        amType: 'composition',
        attrs: {
            line: {
                strokeWidth: thickness,
                targetMarker: {
                    type: 'path',
                    'stroke-width': 2,
                    d: 'M 10 -5 0 0 10 5 20 0 z'
                }
            }
        }
    }),
    specialization: new shapes.standard.Link({
        amType: 'specialization',
        attrs: {
            line: {
                strokeWidth: thickness,
                targetMarker: {
                    type: 'path',
                    fill: 'white',
                    'stroke-width': 2,
                    d: 'M 15 -7 0 0 15 7 z'
                }
            }
        }
    }),
    association: new shapes.standard.Link({
        amType: 'association',
        attrs: {
            line: {
                strokeWidth: thickness,
                targetMarker: null
            }
        }
    }),
    serving: new shapes.standard.Link({
        amType: 'serving',
        attrs: {
            line: {
                strokeWidth: thickness,
                targetMarker: {
                    type: 'path',
                    'stroke-width': thickness,
                    fill: 'none',
                    d: 'M 10 -5 0 0 10 5'
                }
            }
        }
    }),
    flow: new shapes.standard.Link({
        amType: 'flow',
        attrs: {
            line: {
                strokeWidth: thickness,
                strokeDasharray: '6 1',
                targetMarker: {
                    type: 'path',
                    d: 'M 8 -5 0 0 8 5 z'
                }
            }
        }
    }),
    triggering: new shapes.standard.Link({
        amType: 'triggering',
        attrs: {
            line: {
                strokeWidth: thickness,
                targetMarker: {
                    type: 'path',
                    d: 'M 8 -5 0 0 8 5 z'
                }
            }
        }
    })
};

const validRelationships = {
    BusinessActor: {
        BusinessActor: {
            nesting: ['aggregation', 'composition', 'specialization'],
            link: [
                'aggregation',
                'composition',
                'specialization',
                'serving',
                'triggering',
                'flow',
                'association'
            ]
        },
        BusinessObject: {
            nesting: [],
            link: ['access', 'association']
        },
        BusinessProcess: {
            nesting: [],
            link: ['assignment', 'serving', 'triggering', 'flow', 'association']
        }
    },
    BusinessObject: {
        BusinessActor: {
            nesting: ['access'],
            link: ['association']
        },
        BusinessObject: {
            nesting: ['aggregation', 'composition', 'specialization'],
            link: ['aggregation', 'composition', 'specialization', 'association']
        },
        BusinessProcess: {
            nesting: ['access'],
            link: ['association']
        }
    },
    BusinessProcess: {
        BusinessActor: {
            nesting: ['assignment'],
            link: ['serving', 'flow', 'triggering', 'association']
        },
        BusinessObject: {
            nesting: [],
            link: ['access', 'association']
        },
        BusinessProcess: {
            nesting: ['aggregation', 'composition', 'specialization'],
            link: [
                'aggregation',
                'composition',
                'specialization',
                'serving',
                'flow',
                'triggering',
                'association'
            ]
        }
    }
};

// Events

const verticesTool = new linkTools.Vertices();
const linkToolsView = new dia.ToolsView({
    z: 1,
    tools: [verticesTool]
});

paper.on('link:mouseenter', (linkView) => {
    linkView.addTools(linkToolsView);
});

paper.on('link:mouseleave', (linkView) => {
    linkView.removeTools();
});

paper.on('element:mouseenter', (elementView) => {
    const element = elementView.model;
    paper.removeTools();
    highlighters.mask.removeAll(paper, 'hgl-hover');
    HitArea.removeAll(paper);
    // Show frame around the element
    const selector = element.attr('root/highlighterSelector');
    highlighters.mask.add(elementView, selector, 'hgl-hover', hglOptions);
    // Show the link tools
    let y,
        bottom = 5,
        left = 5,
        right = 5,
        top = 5;
    switch (element.get('type')) {
        case 'BusinessProcess':
            y = 'calc(h)';
            bottom = 16;
            top = 16;
            break;
        case 'BusinessActor':
            y = 'calc(h + 14)';
            left = -15;
            right = -15;
            bottom = 30;
            break;
        case 'BusinessObject':
        case 'Container':
        default:
            y = 'calc(h + 14)';
            bottom = 30;
            break;
    }
    const elementToolsView = new dia.ToolsView({
        z: 2,
        tools: [
            new elementTools.Connect({
                scale: 1.6,
                attributes: {
                    cursor: 'pointer'
                },
                markup: util.svg/* xml */ `
                      <rect x="-5" y="-5" width="10" height="10" fill="${hglColor}" stroke="${bgColor}" paint-order="stroke" />
                      <path
                          d="M -4 -1 L 0 -1 L 0 -4 L 4 0 L 0 4 0 1 -4 1 z"
                          fill="#fff"
                      />
                  `,
                x: 'calc(w / 2)',
                y
            })
        ]
    });
    // Make sure that user can reach the tools
    HitArea.add(elementView, 'root', 'hit-area', { top, bottom, left, right });
    elementView.addTools(elementToolsView);
    // Add the tools and the highlighter synchronously.
    paper.requireView(element);
});

// paper.on('element:mouseleave', (elementView) => {
//     highlighters.mask.remove(elementView, 'hgl-hover');
//     HitArea.remove(elementView, 'hit-area');
// });

paper.on('blank:mouseover', () => {
    paper.removeTools();
    highlighters.mask.removeAll(paper, 'hgl-hover');
    HitArea.removeAll(paper);
});

paper.on('link:connect', (linkView, evt) => {
    const dummyLink = linkView.model;

    const source = dummyLink.getSourceCell();
    const target = dummyLink.getTargetCell();
    const relationshipTypes = getValidRelationships(source, target, 'link');
    if (relationshipTypes.length === 0) {
        dummyLink.remove();
        return;
    }

    const contextMenu = new ui.ContextToolbar({
        target: { x: evt.clientX, y: evt.clientY },
        root: paper.el,
        vertical: true,
        anchor: 'top-left',
        tools: relationshipTypes.map((relationshipType) => ({
            action: relationshipType,
            content: `Add <b>${capitalize(relationshipType)}</b>`
        }))
    });

    contextMenu.render();
    commandManager.initBatchCommand();

    contextMenu.on({
        all: (eventName, evt) => {
            if (!eventName.startsWith('action:')) return;
            const [, amType] = eventName.split(':');
            const link = relationshipTemplates[amType].clone();
            const { id: targetId } = dummyLink.target();
            link.source(dummyLink.source());
            link.target({ id: targetId });
            dummyLink.remove();
            graph.addCell(link);
            contextMenu.remove();
            commandManager.storeBatchCommand();
        },
        close: () => {
            dummyLink.remove();
            commandManager.storeBatchCommand();
        }
    });
});

paper.on('blank:contextmenu', (evt) => {
    const contextMenu = new ui.ContextToolbar({
        target: { x: evt.clientX, y: evt.clientY },
        root: paper.el,
        vertical: true,
        anchor: 'top-left',
        tools: [
            {
                action: 'BusinessActor',
                content: 'Add <b>Actor</b>'
            },
            {
                action: 'BusinessObject',
                content: 'Add <b>Object</b>'
            },
            {
                action: 'BusinessProcess',
                content: 'Add <b>Process</b>'
            }
        ]
    });

    contextMenu.render();
    contextMenu.on({
        all: (eventName, evt) => {
            if (!eventName.startsWith('action:')) return;
            const [, amType] = eventName.split(':');
            const ctor = getConstructorFromType(amType);
            const element = new ctor();
            const size = element.size();
            const position = paper.clientToLocalPoint({
                x: evt.clientX,
                y: evt.clientY
            });
            element.position(
                position.x - size.width / 2,
                position.y - size.height / 2
            );
            graph.addCell(element);
            contextMenu.remove();
        }
    });
});

paper.on({
    'element:pointerdown': (elementView, evt) => {
        ui.ContextToolbar.close();
        elementView.el.style.opacity = 0.5;
    },
    'element:pointermove': (elementView, evt) => {
        highlighters.mask.removeAll(paper);
        const element = elementView.model;
        const parent = graph.findModelsUnderElement(element).at(-1);
        if (parent) {
            const availableRelationships = getAvailableRelationships(
                element,
                parent,
                'nesting'
            );
            if (availableRelationships.length === 0) return;
            const selector = parent.attr('root/highlighterSelector');
            highlighters.mask.add(
                parent.findView(paper),
                selector,
                'parent-preview',
                hglOptions
            );
        }
    },
    'element:pointerup': (elementView, evt) => {
        elementView.el.style.opacity = '';

        const element = elementView.model;
        const parent = graph.findModelsUnderElement(element).at(-1);
        if (!parent) return;

        const availableRelationships = getAvailableRelationships(
            element,
            parent,
            'nesting'
        );
        if (availableRelationships.length === 0) {
            if (getValidRelationships(element, parent, 'nesting').length > 0) {
                // There is already a relationship between the two elements
                embedElement(element, parent);
            }
            highlighters.mask.removeAll(paper);
            return;
        }

        const contextMenu = new ui.ContextToolbar({
            target: { x: evt.clientX, y: evt.clientY },
            root: paper.el,
            vertical: true,
            anchor: 'top-left',
            tools: availableRelationships.map((relationshipType) => ({
                action: relationshipType,
                content: `Add <b>${capitalize(relationshipType)}</b>`
            }))
        });

        contextMenu.render();
        commandManager.initBatchCommand();

        contextMenu.on({
            all: (eventName, evt) => {
                if (!eventName.startsWith('action:')) return;
                const [, relationshipType] = eventName.split(':');
                const container = embedElement(element, parent);
                const link = relationshipTemplates[relationshipType].clone();
                link.source(element);
                link.target(container);
                graph.addCell(link);
                link.toFront();

                highlighters.mask.removeAll(paper, 'parent-preview');
                contextMenu.remove();
                commandManager.storeBatchCommand();
            },
            close: () => {
                highlighters.mask.removeAll(paper, 'parent-preview');
                commandManager.storeBatchCommand();
            }
        });
    }
});

paper.on('element:contextmenu', (elementView, evt) => {
    const element = elementView.model;
    const hasChildren = element.getEmbeddedCells().length > 0;
    const tools = [
        {
            action: 'toggle-visual',
            content: 'Toggle Visual',
            attrs: {
                disabled: hasChildren
            }
        },
        {
            action: 'delete',
            content: 'Delete'
        }
    ];

    if (Container.isContainer(element)) {
        tools.splice(1, 0, {
            action: 'resize-container',
            content: hasChildren ? 'Set Minimal Size' : 'Set Default Size'
        });
    }

    const contextMenu = new ui.ContextToolbar({
        // target: elementView.el,
        target: { x: evt.clientX, y: evt.clientY },
        root: paper.el,
        vertical: true,
        anchor: 'top-left',
        tools
    });

    selectElement(paper, element);

    contextMenu.render();
    contextMenu.on({
        'action:toggle-visual': () => {
            commandManager.initBatchCommand();
            toggleVisual(element, element.getNextVisual());
            contextMenu.remove();
            commandManager.storeBatchCommand();
        },
        'action:delete': () => {
            element.remove();
            contextMenu.remove();
        },
        'action:resize-container': () => {
            wrapElementAroundChildren(element);
            contextMenu.remove();
        },
        close: () => {
            unselectElements(paper);
        }
    });
});

paper.on('link:contextmenu', (linkView, evt) => {
    const link = linkView.model;

    const contextMenu = new ui.ContextToolbar({
        target: { x: evt.clientX, y: evt.clientY },
        root: paper.el,
        vertical: true,
        anchor: 'top-left',
        tools: [
            {
                action: 'delete',
                content: 'Delete'
            }
        ]
    });

    selectElement(paper, link);

    contextMenu.render();
    contextMenu.on({
        'action:delete': () => {
            link.remove();
            contextMenu.remove();
        },
        close: () => {
            unselectElements(paper);
        }
    });
});

// Functions

function wrapAncestorsAroundElement(element, opt = {}) {
    element.fitParent({ ...defaultResizeOptions, ...opt });
}

function wrapElementAroundChildren(element, opt = {}) {
    if (element.getEmbeddedCells().length === 0) {
        const { width, height } = Container.prototype.defaults.size;
        const center = element.getBBox().center();
        element.startBatch('resize');
        element.position(center.x - width / 2, center.y - height / 2);
        element.resize(width, height);
        element.stopBatch('resize');
    } else {
        element.fitToChildren({ ...defaultResizeOptions, ...opt });
    }
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function embedElement(element, parent) {
    parent.embed(element);
    let container = parent;
    if (!Container.isContainer(parent)) {
        // The parent must be a container
        container = toggleVisual(parent, Container.fromIcon(parent));
    }
    wrapAncestorsAroundElement(element, { expandOnly: true });
    return container;
}

function getValidRelationships(source, target, type) {
    const sourceType = source.get('amType');
    const targetType = target.get('amType');
    const relationshipDef =
        validRelationships[sourceType] &&
        validRelationships[sourceType][targetType];
    if (!relationshipDef) {
        throw new Error('Relationship not defined.');
    }
    return relationshipDef[type] || [];
}

function getAvailableRelationships(source, target, type) {
    const validRelationships = getValidRelationships(source, target, type);
    const currentRelationships = getExistingRelationships(source, target);
    if (util.intersection(validRelationships, currentRelationships).length > 0)
        return [];
    return validRelationships;
}

function getExistingRelationships(source, target) {
    const links = graph.getConnectedLinks(source);
    return links
        .filter((link) => {
            const sourceCell = link.getSourceCell();
            const targetCell = link.getTargetCell();
            return (
                (sourceCell === source && targetCell === target) ||
                (sourceCell === target && targetCell === source)
            );
        })
        .map((link) => link.get('amType'));
}

function toggleVisual(element1, element2) {
    const el1BBox = element1.getBBox();
    const el2Size = element2.size();
    element2.position(
        el1BBox.x + el1BBox.width / 2 - el2Size.width / 2,
        el1BBox.y + el1BBox.height / 2 - el2Size.height / 2
    );
    element2.set('z', element1.z());
    graph.addCell(element2);
    // Reconnect links
    const outLinks = graph.getConnectedLinks(element1, { inbound: true });
    outLinks.forEach((link) => {
        link.target({ id: element2.id });
    });
    const inLinks = graph.getConnectedLinks(element1, { outbound: true });
    inLinks.forEach((link) => {
        link.source({ id: element2.id });
    });
    // Insert the element into previous parent
    const parent = element1.getParentCell();
    if (parent) {
        parent.embed(element2);
        wrapAncestorsAroundElement(element2, { expandOnly: true });
    }
    // Reinsert children
    const children = element1.getEmbeddedCells();
    children.forEach((child) => {
        element1.unembed(child);
        element2.embed(child);
    });
    // Remove old element
    element1.remove();
    return element2;
}

function selectElement(paper, element) {
    highlighters.mask.add(
        element.findView(paper),
        element.attr('root/highlighterSelector'),
        'selection',
        {
            attrs: {
                stroke: hglColor,
                'stroke-width': 2
            }
        }
    );
}

function unselectElements(paper) {
    highlighters.mask.removeAll(paper, 'selection');
}

// Example graph

commandManager.stopListening();

const actor1 = new BusinessActor({
    position: { x: 90, y: 100 },
    attrs: {
        label: {
            text: 'Direct Banking'
        }
    }
});

const actor2 = new BusinessActor({
    position: { x: 290, y: 100 },
    attrs: {
        label: {
            text: 'Extraordinary Loan Instalments'
        }
    }
});

const actor3 = new BusinessActor({
    position: { x: 490, y: 100 },
    attrs: {
        label: {
            text: 'Payment and Settlement'
        }
    }
});

const process1 = new BusinessProcess({
    position: { x: 90, y: 300 },
    attrs: {
        label: {
            text: 'Client Authentication'
        }
    }
});

const process2 = new BusinessProcess({
    position: { x: 290, y: 300 },
    attrs: {
        label: {
            text: 'Credit Risk Assessment'
        }
    }
});

const process3 = new BusinessProcess({
    position: { x: 490, y: 300 },
    attrs: {
        label: {
            text: 'Loan Repayment'
        }
    }
});

const object1 = new BusinessObject({
    position: { x: 100, y: 500 },
    attrs: {
        label: {
            text: 'List of Clients'
        }
    }
});

const object2 = new BusinessObject({
    position: { x: 300, y: 500 },
    attrs: {
        label: {
            text: 'Register of Debtors'
        }
    }
});

const object3 = new BusinessObject({
    position: { x: 500, y: 500 },
    attrs: {
        label: {
            text: 'Payment Order'
        }
    }
});
const process4 = Container.fromIcon(
    new BusinessProcess({
        position: { x: 600, y: 200 },
        attrs: {
            label: {
                text: 'Granting Consumer Loans'
            }
        }
    })
);

graph.addCells([
    process4,
    actor1,
    actor2,
    actor3,
    object1,
    object2,
    object3,
    process1,
    process2,
    process3
]);

process4.embed([process1, process2, process3]);
wrapElementAroundChildren(process4);

const access1 = relationshipTemplates.access
    .clone()
    .source(process1)
    .target(object1);
const access2 = relationshipTemplates.access
    .clone()
    .source(process2)
    .target(object2);
const access3 = relationshipTemplates.access
    .clone()
    .source(process3)
    .target(object3);

const assignment1 = relationshipTemplates.assignment
    .clone()
    .source(actor1)
    .target(process1);
const assignment2 = relationshipTemplates.assignment
    .clone()
    .source(actor2)
    .target(process2);
const assignment3 = relationshipTemplates.assignment
    .clone()
    .source(actor3)
    .target(process3);

const aggregation1 = relationshipTemplates.aggregation
    .clone()
    .source(process1)
    .target(process4);
const aggregation2 = relationshipTemplates.aggregation
    .clone()
    .source(process2)
    .target(process4);
const aggregation3 = relationshipTemplates.aggregation
    .clone()
    .source(process3)
    .target(process4);

graph.addCells([
    access1,
    access2,
    access3,
    assignment1,
    assignment2,
    assignment3,
    aggregation1,
    aggregation2,
    aggregation3
]);

graph.getLinks().forEach((link) => link.reparent());

commandManager.listen();
