import type { dia } from '@joint/plus';

export interface ConnectionSource {
    nodeId: dia.Cell.ID;
    outputIndex: number;
}

export interface ConnectionTarget {
    nodeId: dia.Cell.ID;
    inputIndex: number;
}

export class Connection {
    constructor(public linkModel: dia.Link, public source: ConnectionSource, public target: ConnectionTarget) {
    }
}
