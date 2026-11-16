import { useGraph, useOnGraphEvents } from '@joint/react-plus';
import { nextTag } from './cells';
import { isEquipmentData } from './model';

/** The tags of the equipment in the graph, but the one of `exceptId`. */
export function tagsInUse(graph: ReturnType<typeof useGraph>['graph'], exceptId?: string | number): Set<string> {
    const tags = new Set<string>();
    for (const element of graph.getElements()) {
        const data: unknown = element.get('data');
        if (element.id !== exceptId && isEquipmentData(data)) {
            tags.add(data.tag);
        }
    }
    return tags;
}

/**
 * Keeps every tag unique: the plant addresses equipment by its tag, so a copy
 * (pasted, duplicated) gets the next free tag of its series. The write joins the
 * paste's batch, so one undo removes the copy and its new tag together.
 */
export function useUniqueTags(): void {
    const { graph, setCellData } = useGraph();
    useOnGraphEvents({
        add: (cell) => {
            const data: unknown = cell.get('data');
            if (!cell.isElement() || !isEquipmentData(data)) {
                return;
            }
            const used = tagsInUse(graph, cell.id);
            if (used.has(data.tag)) {
                setCellData(cell.id, { ...data, tag: nextTag(data.kind, used) });
            }
        },
    });
}
