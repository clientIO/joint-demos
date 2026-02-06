import type { Token } from '../shapes';

// gtoken interfaces
interface IToken {
    data: ITokenBody
}

interface ITokenBody {
    id: string,
    currentLutIndex: number,
    lut: Array<{ x: number, y: number, rotation: number }>,
    start: number,
    end: number,
    element: Token,
    move?: (value: number) => void
}

// gdata interfaces
interface IData {
    response: IDataType,
    status: string
}

interface IDataType {
    nodes: INodeLabel,
    arcs: IArcLabel
}

interface INodeLabel {
    [key: string]: INode
}

interface IArcLabel {
    [key: string]: IArc
}

interface INode {
    label: string,
    frequency: {
        absolute: number,
        relative: number,
        cases: number,
        maxRepetition: number
    },
    duration: {
        total: number,
        min: number,
        max: number,
        mean: number,
        median: number
    },
    event_name: string,
    event_type: null
}

interface IArc {
    source: string,
    target: string,
    frequency: {
        absolute: number,
        relative: number,
        cases: number,
        maxRepetition: number
    },
    duration: {
        total: number,
        min: number,
        max: number,
        mean: number,
        median: number
    },
    dependency: number
}

export {
    IData,
    IArc,
    IToken
};
