import { dia } from "@joint/plus";

export interface TreeNode {
    id: string,
    name: string,
    graph?: dia.Graph,
    children?: TreeNode[],
    isElement?: boolean,
    selected?: boolean
}
