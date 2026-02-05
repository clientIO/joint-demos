import { DirectedGraph } from '@joint/layout-directed-graph';
import { SystemButton } from '../../models';

export function layoutCells(graph, cells, options) {
    const { nodes, edges, buttons, buttonLines, } = cells;
    
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
