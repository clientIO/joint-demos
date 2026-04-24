import { Node, Edge } from './shapes';

export function createExampleCells() {
    const c1 = new Node({
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
        ports: {
            items: [
                { group: 'top', id: 'port1' },
                { group: 'top', id: 'port2' },
                { group: 'right', id: 'port3' },
                { group: 'left', id: 'port4' }
            ]
        }
    });

    const c2 = c1.clone().set({
        position: { x: 300, y: 300 },
        size: { width: 100, height: 100 }
    });

    const c3 = c1.clone().set({
        position: { x: 500, y: 100 },
        size: { width: 100, height: 100 }
    });

    const c4 = new Node({
        position: { x: 100, y: 400 },
        size: { width: 100, height: 100 }
    });

    const c5 = c4.clone().set({
        position: { x: 500, y: 300 },
        size: { width: 100, height: 100 }
    });

    const l1 = new Edge({
        source: { id: c1.id, port: 'port4' },
        target: { id: c2.id, port: 'port4' }
    });

    const l2 = new Edge({
        source: { id: c2.id, port: 'port2' },
        target: { id: c3.id, port: 'port4' }
    });

    const l3 = new Edge({
        source: { id: c4.id },
        target: { id: c5.id }
    });

    const l4 = new Edge({
        source: { id: c5.id },
        target: { id: c4.id }
    });

    return [c1, c2, c3, c4, c5, l1, l2, l3, l4];
}
