import type { dia } from '@joint/plus';

export interface TreeData {
    // Unique identifier
    id: string;
    // Type of the element
    type?: string;
    // Label of the element
    label?: string;
    // Links between children
    connections?: 'none' | 'parallel' | 'serial' | 'branch';
    // Connection type
    connectionDirection?: 'none' | 'forward' | 'backward' | 'bidirectional';
    // Connection style
    connectionStyle?: 'solid' | 'dashed' | 'dotted';
    // Children of the element
    children?: TreeData[];
    // The width of the element
    size?: number;
    // Whether the element should be hidden
    hidden?: boolean;
    // Boundary around the element and its descendants
    boundary?: boolean;
    // Boundary label
    boundaryLabel?: string;
    // Margin
    margin?: number;
}

export type Node = TreeData & dia.Element;
