import type { dia, layout } from '@joint/plus';
import { util } from '@joint/plus';
import { TREE_PARENT_GAP, TREE_SIBLING_GAP } from '../../theme';

export default {
    parentGap: TREE_PARENT_GAP,
    siblingGap: TREE_SIBLING_GAP,
    updateVertices: util.noop,
    updateSiblingRank: (element: dia.Element, siblingRank: layout.TreeLayout.SiblingRank) => {
        element.set({ siblingRank }, { addToHistory: true });
    }
} as Partial<layout.TreeLayout.Options>;
