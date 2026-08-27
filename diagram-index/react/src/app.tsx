import { useCallback, useState } from 'react';
import { Diagram } from '@joint/react-plus';
import type { CellId, InteractionsOptions } from '@joint/react-plus';
import { useSimpleTreeViewApiRef } from '@mui/x-tree-view/hooks';
import { DiagramTree } from '@/components/diagram-tree';
import { IndexCanvas } from '@/components/diagram';
import { DIAGRAMS, toItemId } from '@/data/cells';

const [INITIAL_DIAGRAM] = DIAGRAMS;

/**
 * Drop the built-in click-to-select / Shift-region / Delete / Ctrl+A — the
 * canvas owns selection through its pointer-click handlers. The paperScroller
 * interactions (blank-drag panning, wheel, pinch zoom) stay on.
 */
const INTERACTIONS: InteractionsOptions = { selection: false };

/** Which diagram the canvas shows, and — after a cross-diagram jump — which of its cells to select on mount. */
interface View {
    readonly diagramId: string;
    readonly cellId: string | null;
}

/**
 * The app owns only *navigation* state: the visible diagram (`view`, driving
 * the keyed `<Diagram>` remount) and the tree's expansion. The selected cell
 * lives in one place — the diagram's selection collection: the canvas writes
 * it on clicks, the tree writes it on focus and reads it back reactively, and
 * the renderers draw it via `useIsCellSelected()`.
 */
export function App() {
    const apiRef = useSimpleTreeViewApiRef();
    const [view, setView] = useState<View>({ diagramId: INITIAL_DIAGRAM.id, cellId: null });
    const [expandedItems, setExpandedItems] = useState<string[]>([INITIAL_DIAGRAM.id]);

    const diagram = DIAGRAMS.find((d) => d.id === view.diagramId) ?? INITIAL_DIAGRAM;

    /** Reveals a diagram's subtree in the index. */
    const expandDiagram = useCallback((diagramId: string) => {
        setExpandedItems((previous) =>
            previous.includes(diagramId) ? previous : [...previous, diagramId]);
    }, []);

    /*
     * Cross-diagram jump from the tree: the target diagram's selection
     * collection does not exist until its `<Diagram>` mounts, so the cell to
     * select travels as part of the view and the canvas applies it on mount.
     */
    const handleNavigate = useCallback((diagramId: string, cellId: string | null) => {
        setView({ diagramId, cellId });
        if (cellId !== null) expandDiagram(diagramId);
    }, [expandDiagram]);

    /*
     * A canvas click already wrote the selection; what is left is the tree:
     * reveal the leaf and move DOM focus onto it, so keyboard navigation
     * continues from the clicked cell. A blank click clears focus instead.
     */
    const handleCanvasClick = useCallback((cellId: CellId | null) => {
        if (cellId === null) {
            (document.activeElement as HTMLElement | null)?.blur();
            return;
        }
        expandDiagram(diagram.id);
        apiRef.current?.focusItem(null, toItemId(diagram.id, cellId));
    }, [apiRef, diagram.id, expandDiagram]);

    return (
        <Diagram key={diagram.id} initialCells={diagram.cells} interactions={INTERACTIONS}>
            <div className="app">
                <DiagramTree
                    diagrams={DIAGRAMS}
                    apiRef={apiRef}
                    activeDiagramId={diagram.id}
                    expandedItems={expandedItems}
                    onExpandedChange={setExpandedItems}
                    onNavigate={handleNavigate}
                />
                <IndexCanvas initialCellId={view.cellId} onCellClick={handleCanvasClick} />
            </div>
        </Diagram>
    );
}
