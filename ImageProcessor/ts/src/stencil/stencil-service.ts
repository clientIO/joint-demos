import { dia, ui } from '@joint/plus';
import { getStencilConfig, getStencilGroups } from './stencil-config';
import { createNodeByType, createNodeShape } from '../nodes/node-helper';
import type { Node } from '../nodes/node';
export class StencilService {
    stencil: ui.Stencil;

    constructor(element: HTMLElement, paperScroller: ui.PaperScroller, namespace: any) {
        this.stencil = new ui.Stencil({
            paper: paperScroller,
            groups: getStencilGroups(),
            dropAnimation: true,
            groupsToggleButtons: true,
            search: {
                '*': ['type', 'attrs/label/text'],
            },
            paperOptions: () => {
                return {
                    model: new dia.Graph({}, {
                        cellNamespace: namespace
                    }),
                    cellViewNamespace: namespace
                };
            },
            layout: (graph: dia.Graph) => {
                graph.getElements().forEach((el, index) => {
                    const q = Math.floor(index/3);
                    const r = index % 3;
                    el.position(70 * r + 20, q * 70 + 10);
                });
            },
            dragStartClone: (el) => {
                const node = (el.get('node') as Node).clone();
                return createNodeShape(node);
            },
            // Create the diagram element
            dragEndClone: (el) => {
                const stencilNode = el as Node;
                const node = createNodeByType(stencilNode.get('type'));
                return createNodeShape(node);
            }
        });

        element.appendChild(this.stencil.el);
        this.stencil.render();

        this.stencil.load(getStencilConfig());
    }
}
