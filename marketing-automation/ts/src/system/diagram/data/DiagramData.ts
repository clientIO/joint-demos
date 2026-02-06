import type { dia } from '@joint/plus';
import { util, mvc } from '@joint/plus';
import { removeEdge, removeNode, sortChildren, insertNode, appendNode, createNode, changeNode, addEdge, changeEdge } from './utils';

import type { SortIteratee, SystemDiagramJSON, SystemNodeData, ToEdge } from '../types';

export interface DiagramSetOptions extends mvc.ModelSetOptions {
    disableOptimalOrderHeuristic?: boolean;
    build?: boolean;
}

export default class DiagramData<N extends SystemNodeData> extends mvc.Model<SystemDiagramJSON<N>, DiagramSetOptions> {

    removeEdge(parentId: dia.Cell.ID, childId: dia.Cell.ID, options: DiagramSetOptions = {}) {
        return this.setData((json) => removeEdge(json, parentId, childId), options);
    }

    removeNode(id: dia.Cell.ID, options: DiagramSetOptions = {}) {
        return this.setData((json) => removeNode(json, id), options);
    }

    removeNodes(ids: dia.Cell.ID[], options: DiagramSetOptions = {}) {
        return this.setData((json) => {
            ids.forEach((id) => {
                removeNode(json, id);
            });
        }, options);
    }

    insertNode(data: N, parentId: dia.Cell.ID, childId: dia.Cell.ID, options: DiagramSetOptions = {}) {
        return this.setData<dia.Cell.ID>((json) => insertNode(data, json, parentId, childId), options);
    }

    appendNode(data: N, parentId: dia.Cell.ID, options: DiagramSetOptions = {}) {
        return this.setData<dia.Cell.ID>((json) => appendNode(data, json, parentId), options);
    }

    createNode(data: N, id: dia.Cell.ID = util.uuid(), options: DiagramSetOptions = {}) {
        return this.setData<dia.Cell.ID>((json => createNode<N>(data, json, id)), options);
    }

    changeNode(id: dia.Cell.ID, data: Partial<N>, options: DiagramSetOptions = {}) {
        return this.setData((json) => changeNode<N>(json, id, data), options);
    }

    changeNodes(ids: dia.Cell.ID[], data: { [id: string]: Partial<N> }, options: DiagramSetOptions = {}) {
        return this.setData((json) => {
            ids.forEach((id) => {
                changeNode<N>(json, id, data[id]);
            });
        }, options);
    }

    addEdge(parentId: dia.Cell.ID, childId: dia.Cell.ID, options: DiagramSetOptions = {}) {
        return this.setData((json) => addEdge(json, parentId, childId), options);
    }

    changeEdge(parentId: dia.Cell.ID, childId: dia.Cell.ID, edge: Partial<ToEdge<N>>, options: DiagramSetOptions = {}) {
        return this.setData((json) => changeEdge(json, parentId, childId, edge), options);
    }

    sortChildren(id: dia.Cell.ID, graph: dia.Graph, iteratee: SortIteratee<dia.Element>, options: DiagramSetOptions = {}) {
        return this.setData((json) => sortChildren(json, id, graph, iteratee), options);
    }

    sortNodes(graph: dia.Graph, iteratee: SortIteratee<dia.Element>, options: DiagramSetOptions = {}) {
        return this.setData((json) => sortChildren(json, graph.id, graph, iteratee), options);
    }

    runInBatch<T>(batchName: string, action: () => T, options: DiagramSetOptions = {}): T {
        this.startBatch(batchName, options);
        const res = action();
        this.stopBatch(batchName, options);
        return res;
    }

    fromJSON(json: SystemDiagramJSON<N>, options: DiagramSetOptions = {}) {
        this.runInBatch('from-json', () => {
            this.clear().set(json, options);
        }, options);
    }

    protected startBatch(batchName: string, options: DiagramSetOptions = {}) {
        this.trigger('batch:start', { ...options, batchName });
    }

    protected stopBatch(batchName: string, options: DiagramSetOptions = {}) {
        this.trigger('batch:stop', { ...options, batchName });
    }

    protected copyData(): SystemDiagramJSON<N> {
        return util.cloneDeep(this.attributes) as SystemDiagramJSON<N>;
    }

    protected batchName: string = 'action';

    protected setData<T = void>(action: (json: SystemDiagramJSON<N>) => T, options: DiagramSetOptions = {}): T {
        const json = this.copyData();
        const res = action(json);
        this.startBatch(this.batchName, options);
        util.difference(Object.keys(this.attributes), Object.keys(json)).forEach((key) => {
            this.unset(key);
        });
        this.set(json, options);
        this.stopBatch(this.batchName, options);
        return res;
    }
}
