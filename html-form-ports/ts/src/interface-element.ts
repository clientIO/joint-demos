import { dia, util } from '@joint/core';

import { HtmlPortsElementView } from './html-ports-view';

export interface InterfaceItem {
    id: string;
    label: string;
    value?: string;
}

// A data-mapping interface — a titled list of items, each with a port on the
// element's side ('left' or 'right'). The ports share a single group with an
// absolute position layout; the coordinates are measured from the rendered
// HTML rows by the InterfaceElementView.
export class InterfaceElement extends dia.Element {

    defaults(): Partial<dia.Element.Attributes> {
        return {
            ...super.defaults,
            type: 'InterfaceElement',
            size: { width: 180, height: 120 },
            title: 'Interface',
            side: 'right',
            items: [],
            attrs: {
                root: {
                    cursor: 'move',
                    magnet: false
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: '#fbf5e0',
                    stroke: '#705d10',
                    strokeWidth: 1,
                    rx: 6,
                    ry: 6
                },
                fo: {
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    height: 'calc(h)'
                }
            },
            ports: {
                groups: {
                    item: {
                        position: 'absolute',
                        attrs: {
                            portBody: {
                                magnet: true,
                                r: 5,
                                fill: '#705d10',
                                stroke: '#705d10',
                                strokeWidth: 2,
                                cursor: 'crosshair'
                            }
                        },
                        markup: util.svg`
                            <circle @selector="portBody" />
                        `
                    }
                },
                items: []
            }
        };
    }

    preinitialize(): void {
        this.markup = util.svg`
            <rect @selector="body" />
            <foreignObject @selector="fo" />
        `;
    }

    initialize(attributes?: dia.Element.Attributes, options?: dia.Cell.Options): void {
        super.initialize(attributes, options);
        // One port per item — placeholder coordinates, updated by the view.
        // In ports (output interface, side 'left') are hollow, out ports
        // (input interface, side 'right') are solid — only the fill differs.
        const isInPort = this.get('side') === 'left';
        this.prop('ports/items', this.getItems().map((item) => ({
            id: item.id,
            group: 'item',
            args: { x: 0, y: 0 },
            attrs: isInPort ? {
                portBody: {
                    fill: '#ffffff'
                }
            } : {}
        })));
    }

    getItems(): InterfaceItem[] {
        return this.get('items') ?? [];
    }

    getItemValue(id: string): string {
        return this.getItems().find((item) => item.id === id)?.value ?? '';
    }

    setItemValue(id: string, value: string): void {
        const index = this.getItems().findIndex((item) => item.id === id);
        if (index === -1) return;
        this.prop(['items', index, 'value'], value);
    }
}

export class InterfaceElementView extends HtmlPortsElementView {

    private list: HTMLDivElement | null = null;

    override presentationAttributes(): dia.CellView.PresentationAttributes {
        return dia.ElementView.addPresentationAttributes({
            size: ['PORT_POSITIONS'],
            items: ['ITEMS']
        });
    }

    override initFlag(): dia.CellView.FlagLabel {
        return ['RENDER', 'ITEMS'];
    }

    override confirmUpdate(flags: number, opt: Record<string, unknown>): number {
        let remaining = super.confirmUpdate(flags, opt);
        if (this.hasFlag(remaining, 'ITEMS')) {
            this.updateItemValues();
            remaining = this.removeFlag(remaining, 'ITEMS');
        }
        return remaining;
    }

    override onRender(): void {
        this.renderList();
        this.updateItemValues();
    }

    protected renderList(): void {
        const fo = this.findNode('fo') as SVGForeignObjectElement;
        if (!fo) return;
        fo.replaceChildren();
        const model = this.model as InterfaceElement;
        const list = document.createElement('div');
        list.className = 'interface-element';
        const title = document.createElement('div');
        title.className = 'interface-element-title';
        title.textContent = String(model.get('title') ?? '');
        list.appendChild(title);
        model.getItems().forEach((item) => {
            const row = document.createElement('div');
            row.className = 'interface-element-item';
            row.dataset.item = item.id;
            const label = document.createElement('span');
            label.className = 'interface-element-label';
            label.textContent = item.label;
            row.appendChild(label);
            const value = document.createElement('span');
            value.className = 'interface-element-value';
            row.appendChild(value);
            list.appendChild(row);
        });
        fo.appendChild(list);
        this.list = list;
    }

    protected updateItemValues(): void {
        const { list } = this;
        if (!list) return;
        const model = this.model as InterfaceElement;
        list.querySelectorAll<HTMLElement>('[data-item]').forEach((row) => {
            const value = model.getItemValue(row.dataset.item!);
            row.querySelector('.interface-element-value')!.textContent = value;
            // A long value is truncated with an ellipsis — show it in full
            // on hover.
            row.title = value;
        });
    }

    // Place each port on the element's side, vertically centered to its row.
    protected updatePortPositions(): void {
        const { list, model } = this;
        if (!list) return;
        const x = model.get('side') === 'left' ? 0 : model.size().width;
        const args: Record<string, dia.Point> = {};
        list.querySelectorAll<HTMLElement>('[data-item]').forEach((row) => {
            const rect = this.localRect(row);
            args[row.dataset.item!] = {
                x,
                y: rect.y + rect.height / 2
            };
        });
        this.setPortArgs(args);
    }
}
