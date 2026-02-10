import { dia, ui, util } from '@joint/plus';
import { App } from '../app';

export class NodeView extends dia.ElementView {
    events() {
        return {
            'click .node-help-hitbox': (evt) => { this.onHelpButtonClick(evt); },
        };
    }

    initialize() {
        super.initialize();
    }

    onHelpButtonClick(_evt) {
        this.openHelp(this.model.get('type'), this.el);
    }

    async openHelp(type, target) {
        const helpHtml = await (await fetch(`assets/help/${type}.html`)).text();

        const popup = new ui.Popup({
            content: helpHtml,
            target: target,
            anchor: 'left',
            position: 'right',
            arrowPosition: 'none'
        });
        popup.render();
    }
}

export const nodeMarkupSettings = {
    headerHeight: 24,
    portOffset: 30,
    baseWidth: 150
};

export function calculateHeight(portNumber) {
    return nodeMarkupSettings.headerHeight +
        portNumber * nodeMarkupSettings.portOffset;
}
export class Node extends dia.Element {
    inputProperties = {};

    constructor(attributes, options) {
        super(attributes, options);

        this.on('change:name', () => {
            this.attr('nodeLabel/text', this.get('name'));
        });
    }

    preinitialize() {
        this.markup = util.svg /* xml */ `
            <rect @selector="nodeBody" class="node-body" cursor="move"/>
            <clipPath @selector="clipPath">
                <rect @selector="clipPathRect"/>
            </clipPath>
            <rect @selector="nodeHeader" class="node-header" cursor="move"/>
            <circle @selector="helpHitbox" class="node-help-hitbox" cursor="pointer"/>
            <use @selector="help" class="node-help" href="assets/help.svg#questionMark"></use>
            <text @selector="nodeLabel" class="node-label"/>
        `;
    }

    defaults() {

        const portsIn = {
            position: (ports) => {
                return ports.map((port, i) => {
                    return {
                        x: 0,
                        y: nodeMarkupSettings.headerHeight +
                            nodeMarkupSettings.portOffset * i + nodeMarkupSettings.portOffset / 2
                    };
                });
            },
            attrs: {
                portBody: {
                    cursor: 'crosshair',
                    magnet: true,
                    r: 6,
                    strokeWidth: 4,
                }
            },
            label: {
                position: {
                    name: 'right',
                },
                markup: [{
                        tagName: 'text',
                        selector: 'label',
                        className: 'node-port-label'
                    }]
            },
            markup: [{
                    tagName: 'circle',
                    selector: 'portBody',
                    className: 'node-port-body'
                }]
        };

        const portsOut = {
            position: (ports, bbox) => {
                return ports.map((port, i) => {
                    return {
                        x: bbox.width,
                        y: nodeMarkupSettings.headerHeight +
                            nodeMarkupSettings.portOffset * i + nodeMarkupSettings.portOffset / 2
                    };
                });
            },
            attrs: {
                portBody: {
                    cursor: 'crosshair',
                    magnet: true,
                    r: 6,
                    strokeWidth: 4,
                }
            },
            label: {
                position: {
                    name: 'left',
                },
                markup: [{
                        tagName: 'text',
                        selector: 'label',
                        className: 'node-port-label'
                    }]
            },
            markup: [{
                    tagName: 'circle',
                    selector: 'portBody',
                    className: 'node-port-body'
                }]
        };

        return {
            ...super.defaults,
            type: 'processor.Node',
            name: 'Node',
            inputSettings: [],
            outputSettings: [],
            properties: {},
            outputs: [],
            group: 'basic',
            size: {
                width: nodeMarkupSettings.baseWidth,
                height: calculateHeight(1)
            },
            attrs: {
                nodeBody: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 6,
                },
                nodeLabel: {
                    x: 15,
                    y: nodeMarkupSettings.headerHeight / 2 + 1,
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                },
                nodeHeader: {
                    width: 'calc(w)',
                    height: nodeMarkupSettings.headerHeight,
                    clipPath: 'url(#clip)'
                },
                clipPathRect: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 6,
                },
                help: {
                    x: 'calc(w-20)',
                    y: 5,
                    width: 15,
                    height: 15,
                    pointerEvents: 'none'
                },
                helpHitbox: {
                    cx: 'calc(w-12)',
                    cy: 12,
                    r: 12
                }
            },
            ports: {
                groups: {
                    'in': portsIn,
                    'out': portsOut
                }
            }
        };
    }

    setProperty(name, value) {
        this.prop(`properties/${name}`, value);
    }

    get properties() {
        const inputSettings = this.get('inputSettings');
        const properties = this.get('properties');

        inputSettings.forEach((input) => {
            if (properties[input.property] == null) {
                properties[input.property] = input.defaultValue;
            }
        });

        return properties;
    }

    get outputs() {
        const outputs = this.get('outputs');
        const outputSettings = this.get('outputSettings');
        return outputSettings.map((o, i) => {
            if (outputs[i] != null) {
                return outputs[i];
            }
            if (o.defaultValue != null) {
                return o.defaultValue;
            }
            return null;
        });
    }

    getInspectorConfig() {
        return {
            groups: {
                node: {
                    label: 'Node',
                    index: 1
                }
            },
            inputs: {
                name: {
                    type: 'text',
                    label: 'Name',
                    group: 'node'
                }
            }
        };
    }

    onInputConnectionAdd(input, value) {
        this.inputProperties[input.property] = this.get(input.property);
        this.prop(`properties/${input.property}`, value);

        App.inspectorService.disable(input.property, this);
    }

    onInputConnectionRemove(input) {
        delete this.inputProperties[input.property];
        this.prop(`properties/${input.property}`, null);

        App.inspectorService.enable(input.property, this);
    }

    getContextToolbarItems() {
        return [];
    }

    setContextToolbarEvents(_contextToolbar) {
        return;
    }

    getFileAttributes() {
        return ['name', 'position'];
    }

    hexToRGB(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    getCurrentData() {
        return [];
    }

    updateCurrentData() {
        const currentData = this.getCurrentData();
        if (App.processor) {
            App.processor.updateCurrentData(this.id, currentData);
        }
    }
}
