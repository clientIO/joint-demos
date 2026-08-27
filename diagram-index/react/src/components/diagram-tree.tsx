import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { useSimpleTreeViewApiRef } from '@mui/x-tree-view/hooks';
import { useCells, useSelectionCollection } from '@joint/react-plus';
import { parseItemId, toItemId } from '@/data/cells';
import type { DiagramSource } from '@/data/cells';

export interface DiagramTreeProps {
    readonly diagrams: readonly DiagramSource[];
    readonly apiRef: ReturnType<typeof useSimpleTreeViewApiRef>;
    readonly activeDiagramId: string;
    readonly expandedItems: readonly string[];
    readonly onExpandedChange: (itemIds: string[]) => void;
    /** A focus landed in another diagram's subtree — switch the canvas over. */
    readonly onNavigate: (diagramId: string, cellId: string | null) => void;
}

/**
 * The index: one root item per diagram, one leaf per cell.
 *
 * Mounted inside `<Diagram>`, so the diagram's selection collection is both
 * read and written right here: the selected tree item is *derived* from the
 * collection (`useCells` re-renders this component when the selection flips),
 * and focusing an item of the active diagram writes straight back into it —
 * no selection state of the tree's own.
 *
 * Selection deliberately rides item *focus*, not item clicks — the behaviour
 * the original demo had: walking the tree with the arrow keys moves the
 * selection (and switches diagrams when crossing into the other subtree), and
 * a mouse click selects because it also focuses. The canvas drives the tree
 * through the same door: `apiRef.current.focusItem(...)` in `app.tsx`.
 */
export function DiagramTree({
    diagrams,
    apiRef,
    activeDiagramId,
    expandedItems,
    onExpandedChange,
    onNavigate,
}: DiagramTreeProps) {
    const { collection, selectCells } = useSelectionCollection();
    const selectedCellId = useCells(collection, (cells) =>
        (cells.length === 0 ? null : cells[0].id));

    const selectedItemId = selectedCellId === null
        ? activeDiagramId
        : toItemId(activeDiagramId, selectedCellId);

    const handleItemFocus = (itemId: string) => {
        const { diagramId, cellId } = parseItemId(itemId);
        if (diagramId !== activeDiagramId) {
            onNavigate(diagramId, cellId);
            return;
        }
        selectCells(cellId === null ? [] : [cellId]);
    };

    return (
        <nav className="tree">
            <header className="tree-header">Diagrams</header>
            <SimpleTreeView
                className="tree-view"
                aria-label="diagram navigation"
                apiRef={apiRef}
                expandedItems={expandedItems as string[]}
                selectedItems={selectedItemId}
                onExpandedItemsChange={(_event, itemIds) => onExpandedChange(itemIds)}
                onItemFocus={(_event, itemId) => handleItemFocus(itemId)}
                slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
            >
                {diagrams.map((diagram) => (
                    <TreeItem key={diagram.id} itemId={diagram.id} label={diagram.name}>
                        {diagram.leaves.map((leaf) => (
                            <TreeItem
                                key={leaf.itemId}
                                itemId={leaf.itemId}
                                label={
                                    <span className="tree-leaf">
                                        <span aria-hidden className="tree-leaf-glyph">
                                            {leaf.isElement ? '▱' : '⇢'}
                                        </span>
                                        {leaf.label}
                                    </span>
                                }
                            />
                        ))}
                    </TreeItem>
                ))}
            </SimpleTreeView>
        </nav>
    );
}
