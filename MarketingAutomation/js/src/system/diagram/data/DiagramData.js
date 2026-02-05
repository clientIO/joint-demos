import { util, mvc } from '@joint/plus';
import { removeEdge, removeNode, sortChildren, insertNode, appendNode, createNode, changeNode, addEdge, changeEdge } from './utils';

export default class DiagramData extends mvc.Model {
    
    removeEdge(parentId, childId, options = {}) {
        return this.setData((json) => removeEdge(json, parentId, childId), options);
    }
    
    removeNode(id, options = {}) {
        return this.setData((json) => removeNode(json, id), options);
    }
    
    removeNodes(ids, options = {}) {
        return this.setData((json) => {
            ids.forEach((id) => {
                removeNode(json, id);
            });
        }, options);
    }
    
    insertNode(data, parentId, childId, options = {}) {
        return this.setData((json) => insertNode(data, json, parentId, childId), options);
    }
    
    appendNode(data, parentId, options = {}) {
        return this.setData((json) => appendNode(data, json, parentId), options);
    }
    
    createNode(data, id = util.uuid(), options = {}) {
        return this.setData((json => createNode(data, json, id)), options);
    }
    
    changeNode(id, data, options = {}) {
        return this.setData((json) => changeNode(json, id, data), options);
    }
    
    changeNodes(ids, data, options = {}) {
        return this.setData((json) => {
            ids.forEach((id) => {
                changeNode(json, id, data[id]);
            });
        }, options);
    }
    
    addEdge(parentId, childId, options = {}) {
        return this.setData((json) => addEdge(json, parentId, childId), options);
    }
    
    changeEdge(parentId, childId, edge, options = {}) {
        return this.setData((json) => changeEdge(json, parentId, childId, edge), options);
    }
    
    sortChildren(id, graph, iteratee, options = {}) {
        return this.setData((json) => sortChildren(json, id, graph, iteratee), options);
    }
    
    sortNodes(graph, iteratee, options = {}) {
        return this.setData((json) => sortChildren(json, graph.id, graph, iteratee), options);
    }
    
    runInBatch(batchName, action, options = {}) {
        this.startBatch(batchName, options);
        const res = action();
        this.stopBatch(batchName, options);
        return res;
    }
    
    fromJSON(json, options = {}) {
        this.runInBatch('from-json', () => {
            this.clear().set(json, options);
        }, options);
    }
    
    startBatch(batchName, options = {}) {
        this.trigger('batch:start', { ...options, batchName });
    }
    
    stopBatch(batchName, options = {}) {
        this.trigger('batch:stop', { ...options, batchName });
    }
    
    copyData() {
        return util.cloneDeep(this.attributes);
    }
    
    batchName = 'action';
    
    setData(action, options = {}) {
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
