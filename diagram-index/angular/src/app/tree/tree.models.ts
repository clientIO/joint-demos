import type { dia } from '@joint/plus';

export interface TreeNode {
    id: string,
    name: string,
    graph?: dia.Graph.JSON,
    children?: TreeNode[],
    isElement?: boolean,
    selected?: boolean
}
