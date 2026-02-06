import { dia, ui, shapes, util } from '@joint/plus';
import './styles.scss';

// Asset imports
import webflowSvg from '../assets/icons/webflow.svg';
import slackSvg from '../assets/icons/slack.svg';
import gmailSvg from '../assets/icons/gmail.svg';

const PortGroup = {
    IN: 'in',
    OUT: 'out'
};

const colors = {
    red: '#ed2637',
    black: '#131e29',
    gray: '#dde6ed',
    yellow: '#f6f740',
    blue: '#00a0e9',
    white: '#ffffff'
};

const actions = [
    'read company name',
    'succeeded',
    'failed',
    'is greater than 200',
    'is less or equal than 200'
];

const elementTemplate = new shapes.standard.BorderedImage({
    size: { width: 120, height: 100 },
    attrs: {
        root: {
            magnet: false
        },
        image: {
            x: 'calc(w / 2 - calc(s / 2 - 20))',
            y: 'calc(h / 2 - calc(s / 2 - 20))',
            width: 'calc(s - 40)',
            height: 'calc(s - 40)',
            // reset defaults
            refX: null,
            refY: null,
            refWidth: null,
            refHeight: null
        },
        border: {
            rx: 8,
            ry: 8,
            stroke: colors.black,
            strokeWidth: 3
        },
        background: {
            fill: colors.white
        },
        label: {
            fill: colors.black,
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            textWrap: {
                width: 'calc(w + 40)',
                height: null
            }
        }
    },
    portMarkup: util.svg`
      <rect @selector="portBody"
        width="20" height="20"
        x="-10" y="-10"
        fill="${colors.red}"
        stroke-width="2"
        stroke="${colors.gray}"
        transform="rotate(45)"
      />
    `,
    ports: {
        groups: {
            [PortGroup.IN]: {
                position: 'left',
                attrs: {
                    portBody: {
                        dataTooltipPosition: 'right',
                        magnet: 'passive'
                    }
                }
            },
            [PortGroup.OUT]: {
                position: 'right',
                attrs: {
                    portBody: {
                        dataTooltipPosition: 'left',
                        magnet: 'active'
                    }
                }
            }
        }
    }
});

const templateLink = new shapes.standard.Link({
    attrs: {
        line: {
            stroke: colors.black,
            strokeWidth: 2
        }
    },
    defaultLabel: {
        markup: util.svg`
            <rect @selector="labelBody" />
            <text @selector="labelText" />
        `,
        attrs: {
            root: {
                cursor: 'pointer'
            },
            labelText: {
                fill: colors.black,
                fontSize: 12,
                fontFamily: 'sans-serif',
                fontWeight: 'bold',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
                textWrap: {
                    width: 100,
                    height: null
                }
            },
            labelBody: {
                rx: 4,
                ry: 4,
                ref: 'labelText',
                x: 'calc(x - 4)',
                y: 'calc(y - 4)',
                width: 'calc(w + 8)',
                height: 'calc(h + 8)',
                fill: colors.white,
                stroke: colors.black,
                strokeWidth: 2
            }
        }
    }
});

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: colors.gray },
    linkPinning: false,
    snapLinks: true,
    interactive: { linkMove: false, labelMove: false },
    defaultConnectionPoint: { name: 'boundary' },
    clickThreshold: 5,
    magnetThreshold: 'onleave',
    markAvailable: true,
    highlighting: {
        connecting: false,
        magnetAvailability: {
            name: 'mask',
            options: {
                padding: 1,
                attrs: {
                    stroke: colors.blue,
                    'stroke-width': 4
                }
            }
        }
    },
    defaultLink: () =>
        createLink(actions[Math.floor(Math.random() * actions.length)]),

    validateMagnet: (sourceView, sourceMagnet) => {
        const sourceGroup = sourceView.findAttribute('port-group', sourceMagnet);
        const sourcePort = sourceView.findAttribute('port', sourceMagnet);
        const source = sourceView.model;
        if (sourceGroup !== PortGroup.OUT) {
            // 'It's not possible to create a link from an inbound port.'
            return false;
        }
        if (getPortLinks(source, sourcePort, false).length > 0) {
            // 'The port has already an inbound link (we allow only one link per port)'
            return false;
        }
        return true;
    },
    validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
        if (sourceView === targetView) {
            // Do not allow a loop link (starting and ending at the same element)/
            return false;
        }
        const targetGroup = targetView.findAttribute('port-group', targetMagnet);
        const targetPort = targetView.findAttribute('port', targetMagnet);
        const target = targetView.model;
        if (target.isLink()) {
            // We allow connecting only links with elements (not links with links).
            return false;
        }
        if (targetGroup !== PortGroup.IN) {
            // It's not possible to add inbound links to output ports (only outbound links are allowed).
            return false;
        }
        if (getPortLinks(target, targetPort, true).length > 0) {
            // The port has already an inbound link (we allow 1 link per port inbound port)
            return false;
        }
        // This is a valid connection.
        return true;
    }
});

document.getElementById('paper-container').appendChild(paper.el);

// Set tooltip colors to match the demo colors.

paper.el.style.setProperty('--tooltip-color', colors.black);
paper.el.style.setProperty('--tooltip-outline-color', colors.gray);

// Create example elements and links.

const webflow1 = createElement(
    webflowSvg,
    'Webflow form is submitted'
)
    .set('service', 'Webflow')
    .addPorts([
        { group: PortGroup.IN, id: 'in1' },
        { group: PortGroup.OUT, id: 'out1' }
    ])
    .position(100, 140);

const clearbit1 = createElement(
    'https://logo.clearbit.com/clearbit.com',
    'Retrieve number of employees'
)
    .set('service', 'Clearbit')
    .addPorts([
        { group: PortGroup.IN, id: 'in1' },
        { group: PortGroup.OUT, id: 'out1' },
        { group: PortGroup.OUT, id: 'out2' }
    ])
    .position(400, 140);

const slack1 = createElement(
    slackSvg,
    'Send Message'
)
    .set('service', 'Slack')
    .addPorts([
        { group: PortGroup.IN, id: 'in1' },
        { group: PortGroup.OUT, id: 'out1' }
    ])
    .position(700, 46);

const gmail1 = createElement(
    gmailSvg,
    'Send Email'
)
    .set('service', 'Gmail')
    .addPorts([
        { group: PortGroup.IN, id: 'in1' },
        { group: PortGroup.OUT, id: 'out1' }
    ])
    .position(700, 240);

const link0 = createLink()
    .set({
        source: { x: 50, y: 190 },
        target: { id: webflow1.id, port: 'in1' }
    })
    .attr({
        line: {
            sourceMarker: {
                type: 'circle',
                fill: colors.red,
                stroke: colors.gray,
                'stroke-width': 2,
                r: 5
            }
        }
    });

const link1 = createLink(actions[0]).set({
    source: { id: webflow1.id, port: 'out1' },
    target: { id: clearbit1.id, port: 'in1' }
});

const link2 = createLink(actions[3]).set({
    source: { id: clearbit1.id, port: 'out1' },
    target: { id: slack1.id, port: 'in1' }
});

const link3 = createLink(actions[4]).set({
    source: { id: clearbit1.id, port: 'out2' },
    target: { id: gmail1.id, port: 'in1' }
});

graph.addCells([
    webflow1,
    clearbit1,
    slack1,
    gmail1,
    link0,
    link1,
    link2,
    link3
]);

// Show a tooltip when the user clicks on a link. The tooltip shows information
// about the source and target elements.

const portTooltip = new ui.Tooltip({
    rootTarget: paper.svg,
    target: '[port]',
    container: paper.el,
    content: function(portNode) {
        const message = (text) => {
            portTooltip.el.classList.toggle('tooltip-empty', !text);
            if (!text) return false;
            return text;
        };

        const view = paper.findView(portNode);
        if (!view) return;
        const element = view.model;
        const portId = view.findAttribute('port', portNode);
        const portGroup = view.findAttribute('port-group', portNode);
        switch (portGroup) {
            case PortGroup.IN: {
                const [link] = getPortLinks(element, portId, true);
                if (!link) return message('');
                const sourceElement = link.getSourceElement();
                if (!sourceElement)
                    return message(
                        `<i>${element.attr(
                            'label/text'
                        )}</i> is the initiating event of the flow.`
                    );
                return message(getContentFromConnection(sourceElement, element, link));
            }
            case PortGroup.OUT: {
                const [link] = getPortLinks(element, portId, false);
                if (!link) return message('');
                const targetElement = link.getTargetElement();
                if (!targetElement)
                    return message(
                        `<i>${element.attr(
                            'label/text'
                        )}</i> is the final event of the flow.`
                    );
                return message(getContentFromConnection(element, targetElement, link));
            }
        }
        return message('');
    },
    direction: 'auto',
    padding: 10
});

// Show the image source in the tooltip when the user hovers over the element image.

// eslint-disable-next-line no-unused-vars
const tooltip = new ui.Tooltip({
    rootTarget: paper.svg,
    target: 'image',
    position: 'bottom',
    padding: 30,
    animation: true,
    container: paper.el,
    content: function(imageNode) {
        const view = paper.findView(imageNode);
        if (!view) return;
        return `Service: <i>${view.model.get('service')}</i>`;
    }
});

// Change the link label when the user clicks on the link.

paper.on('link:pointerclick', ({ model: link }) => {
    const currentLabel = link.prop(['labels', 0, 'attrs', 'labelText', 'text']);
    if (!currentLabel) return;
    const index = actions.indexOf(currentLabel);
    const nextLabel = actions[(index + 1) % actions.length];
    link.prop(['labels', 0, 'attrs', 'labelText', 'text'], nextLabel);
});

// Remove the links that are connected to the port when the user clicks on the port.

paper.on('element:magnet:pointerclick', (elementView, evt, magnet) => {
    evt.stopPropagation();
    const port = elementView.findAttribute('port', magnet);
    const portGroup = elementView.findAttribute('port-group', magnet);
    getPortLinks(
        elementView.model,
        port,
        portGroup === PortGroup.IN
    ).forEach((link) => link.remove());
});

// Hide the tooltip when the user starts dragging an element or a link.
// See CSS for the actual hiding.

paper.on('cell:pointerdown', () => {
    paper.el.classList.add('dragging');
});

paper.on('cell:pointerup', () => {
    paper.el.classList.remove('dragging');
});

// Helpers

function getContentFromConnection(source, target, link) {
    return /* xml */ `
    <div class="connection-tooltip-content">
      If
      <img src="${source.attr('image/xlinkHref')}" width="40" height="40"/>
      <div>
        <i>${source.attr('label/text')} </i>
        →
        <span>
        ${link.prop(['labels', 0, 'attrs', 'labelText', 'text'])}
        </span>
        →
        <i>${target.attr('label/text')}</i>
      </div>
      <img src="${target.attr('image/xlinkHref')}" width="40" height="40"/>
    </div>
  `;
}

function getPortLinks(element, portId, inbound) {
    return graph
        .getConnectedLinks(element, { inbound, outbound: !inbound })
        .filter((link) => {
            const port = inbound ? link.target() : link.source();
            return port.port === portId;
        });
}

function createLink(text) {
    const link = templateLink.clone();
    if (typeof text === 'string') {
        link.labels([
            {
                attrs: {
                    labelText: {
                        fill: colors.gray,
                        fontSize: 12,
                        fontWeight: 'bold',
                        fontFamily: 'sans-serif',
                        text
                    },
                    labelBody: {
                        fill: colors.black
                    }
                }
            }
        ]);
    }
    return link;
}

function createElement(xlinkHref, text) {
    return elementTemplate.clone().attr({
        image: {
            xlinkHref
        },
        label: {
            text
        }
    });
}
