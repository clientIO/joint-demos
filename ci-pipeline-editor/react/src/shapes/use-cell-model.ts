import type { dia } from '@joint/plus';
import { useCellId, useGraph } from '@joint/react-plus';

/**
 * The model of the cell a component renders. It always exists: the paper
 * renders the content of the cells of its graph, so the id of the cell
 * (`useCellId()`) resolves. Not reactive - the model is one instance for
 * the life of the component; what changes on it is read with `useCell()`.
 * The type is the caller's claim, checked nowhere: `useCellModel<StepModel>()`.
 */
export function useCellModel<T extends dia.Cell = dia.Cell>(): T {
    const id = useCellId();
    const { graph } = useGraph();
    const cell = graph.getCell(id);
    if (!cell) throw new Error(`The cell ${id} is not in the graph.`);
    return cell as T;
}
