import { dia, ui } from '@joint/plus';

import { isCellVisible } from './layout';
import { AddButton, COLORS } from './shapes';

/**
 * The map of the diagram, floating over the corner of the paper: a
 * `ui.Navigator` with the default views - the elements as they are, small -
 * and neither the links nor the add buttons: too small to read on the map.
 * It hides the content of the
 * collapsed groups like the paper does and fits the content, measured by
 * the model (see `parkHiddenContent()` in `layout/index.ts`). The viewport
 * of the scroller is drawn over it, to drag around.
 */
export function createNavigator(scroller: ui.PaperScroller): ui.Navigator {
    return new ui.Navigator({
        paperScroller: scroller,
        width: '100%',
        height: '100%',
        padding: 8,
        zoom: false,
        useContentBBox: { useModelGeometry: true },
        paperOptions: {
            // Without `viewManagement` a paper runs in its legacy mode, and
            // calls `cellVisibility` with the view instead of the cell.
            viewManagement: { lazyInitialize: true, disposeHidden: true },
            cellVisibility: (cell) => !cell.isLink() && !AddButton.isAddButton(cell) && isCellVisible(cell),
            sorting: dia.Paper.sorting.APPROX,
            overflow: true,
            background: { color: COLORS.background }
        }
    });
}
