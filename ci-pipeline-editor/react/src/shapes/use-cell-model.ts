import type { dia } from '@joint/plus';
import { useCellId, useGraph } from '@joint/react-plus';

/**
 * The model of the cell a component renders - `null` once the cell is gone:
 * the paper learns of a removal a tick later, so a render in between (a
 * click that removes the cell re-renders the components of the editor at
 * once) still renders its content. Not reactive - the model is one instance
 * for the life of the component; what changes on it is read with `useCell()`.
 * The type is the caller's claim, checked nowhere: `useCellModel<StepModel>()`.
 */
export function useCellModel<T extends dia.Cell = dia.Cell>(): T | null {
    const id = useCellId();
    const { graph } = useGraph();
    return (graph.getCell(id) as T | undefined) ?? null;
}
