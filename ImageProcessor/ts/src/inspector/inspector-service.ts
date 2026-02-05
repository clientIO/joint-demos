import { ui } from '@joint/plus';
import type { Node } from '../nodes/node';

export class InspectorService {
    constructor(private element: HTMLElement) {
        this.renderHelp();
    }

    open(node: Node) {
        const opts = Object.assign({ cell: node }, node.getInspectorConfig());

        this.element.innerHTML = '';
        const inspector = ui.Inspector.create(this.element, opts);

        for (let prop in node.inputProperties) {
            this.disable(prop, node);
        }

        inspector.on('render', () => {
            for (let prop in node.inputProperties) {
                this.disable(prop, node);
            }
        });

        inspector.on('close', () => {
            this.renderHelp();
        });

        return inspector;
    }

    close() {
        ui.Inspector.close();
    }

    disable(property: string, node: Node) {
        if (!ui.Inspector.instance) return;

        const inspectorNode: Node = (<any>ui.Inspector.instance).getModel();
        if (inspectorNode === node) {
            const element = this.element.querySelector(`.field[data-field="properties/${property}"]`);
            if (element) {
                const input = element.querySelector('input');
                if (input) {
                    input.setAttribute('disabled', 'true');
                }
            }
        }
    }

    enable(property: string, node: Node) {
        if (!ui.Inspector.instance) return;

        const inspectorNode: Node = (<any>ui.Inspector.instance).getModel();
        if (inspectorNode === node) {
            const element = this.element.querySelector(`.field[data-field="properties/${property}"]`);
            if (element) {
                const input = element.querySelector('input');
                if (input) {
                    input.removeAttribute('disabled');
                }
            }
        }
    }

    async renderHelp() {
        const helpHtml: string = await (await fetch('assets/inspector/help.html')).text();

        if (!ui.Inspector.instance) {
            this.element.innerHTML = helpHtml;
        }
    }
}

