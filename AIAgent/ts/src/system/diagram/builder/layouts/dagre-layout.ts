import type { dia } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { SystemButton } from '../../models';

import type { AutoLayoutDiagramCells } from '../types';

export function layoutCells(graph: dia.Graph, cells: AutoLayoutDiagramCells, options?: DirectedGraph.LayoutOptions): void {
    const {
        nodes,
        edges,
        buttons,
        buttonLines,
    } = cells;

    DirectedGraph.layout([...nodes, ...edges, ...buttonLines, ...buttons], {
        ...options,
        setVertices: true,
        rankSep: 100,
        setLabels: true,
        setPosition: (el, position) => {
            const x = position.x - position.width / 2;
            let y = position.y - position.height / 2;
            if (SystemButton.isButton(el)) {
                const [parent] = graph.getNeighbors(el, { inbound: true });
                const siblings = graph.getNeighbors(parent, { outbound: true });
                if (siblings.length === 1) {
                    y -= 75;
                }
            }
            el.position(x, y);
        },
    });
}
