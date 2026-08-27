import {
    Paper,
    PaperScroller,
    usePaper,
    usePaperScroller,
    useSelectionCollection,
} from '@joint/react-plus';
import type { CellId } from '@joint/react-plus';
import { useEffect, useRef } from 'react';
import { connectionPoints } from '@joint/plus';
import { CANVAS_COLOR, GRID_COLOR } from '@/theme';
import { RenderNode } from './render-node';
import { RenderLink } from './render-link';

/**
 * Ends every link on the shape's outline — the boundary of the diamond/
 * parallelogram path, not its bounding box. Per end: the target backs off
 * so the arrowhead sits clear of the stroke, the source starts right on it.
 */
const CONNECTION_POINT: connectionPoints.ConnectionPoint = (line, view, magnet, opt, endType, linkView) =>
    connectionPoints.boundary(
        line,
        view,
        magnet,
        { ...opt, offset: endType === 'target' ? 10 : 0 },
        endType,
        linkView,
    );

export interface IndexCanvasProps {
    /** Cell to select right after mount — a cross-diagram jump from the tree. */
    readonly initialCellId: string | null;
    /** A cell (or blank space, `null`) was clicked; the selection is already written. */
    readonly onCellClick: (cellId: CellId | null) => void;
}

/**
 * The canvas of the active diagram. Lives inside the app's keyed `<Diagram>`,
 * so switching diagrams tears it down with everything else.
 *
 * Selection is the diagram's selection collection and nothing else: clicks
 * write into it here, the tree and the renderers (`useIsCellSelected()`) read
 * it back. `onCellClick` only reports the click upward for the tree's
 * expand-and-focus bookkeeping.
 */
export function IndexCanvas({ initialCellId, onCellClick }: IndexCanvasProps) {
    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const { selectCells } = useSelectionCollection();

    // Frame the diagram once per mount at zoom 1 (the old
    // `scroller.render().centerContent(...)`).
    useEffect(() => {
        if (!paper || !paperScroller) return;
        paperScroller.centerContent({ useModelGeometry: true });
    }, [paper, paperScroller]);

    /*
     * A cross-diagram jump carries the cell to select as part of the view
     * (the collection it lands in only exists once this mount is up); apply
     * it exactly once per mount — the ref keeps later `initialCellId` churn
     * from re-selecting a cell the user has clicked away from.
     */
    const appliedInitialSelection = useRef(false);
    useEffect(() => {
        if (appliedInitialSelection.current) return;
        appliedInitialSelection.current = true;
        if (initialCellId !== null) selectCells([initialCellId]);
    }, [initialCellId, selectCells]);

    return (
        <PaperScroller cursor="grab">
            <Paper
                renderElement={RenderNode}
                renderLink={RenderLink}
                interactive={false}
                // The same color the link-label pills carry (`cells.ts`), so a
                // label melts into the ground it sits on.
                background={{ color: CANVAS_COLOR }}
                gridSize={10}
                drawGrid={{ name: 'dot', args: { color: GRID_COLOR, thickness: 1.5 }}}
                drawGridSize={20}
                // A native paper option the react props don't expose.
                options={{ defaultConnectionPoint: CONNECTION_POINT }}
                onCellPointerClick={({ model }) => {
                    selectCells([model.id]);
                    onCellClick(model.id);
                }}
                onBlankPointerClick={() => {
                    selectCells([]);
                    onCellClick(null);
                }}
            />
        </PaperScroller>
    );
}
