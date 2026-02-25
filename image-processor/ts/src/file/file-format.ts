export interface ImpFileNode {
    type: string;
    id: string;
    attributes: { [key: string]: unknown };
}

export interface ImpFileConnection {
    sourceId: string;
    outputIndex: number;
    targetId: string;
    inputIndex: number;
}

export interface ImpFile {
    nodes: ImpFileNode[];
    connections: ImpFileConnection[];
}
