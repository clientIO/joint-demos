import { util, mvc } from '@joint/plus';
import { removeEdge, removeNode, sortChildren, insertNode, appendNode, createNode, changeNode, addEdge, changeEdge } from './utils';

export default class DiagramData extends mvc.Model {
    
    removeEdge(parentData, childData, options = {}) {
        return this.setData((json) => removeEdge(json, parentData, childData), options);
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
    
    insertNode(data, parentData, childData, options = {}) {
        return this.setData((json) => insertNode(data, json, parentData, childData), options);
    }
    
    appendNode(data, parentData, options = {}) {
        return this.setData((json) => appendNode(data, json, parentData), options);
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
    
    addEdge(parentData, childData, options = {}) {
        return this.setData((json) => addEdge(json, parentData, childData), options);
    }
    
    changeEdge(parentData, childData, edge, options = {}) {
        return this.setData((json) => changeEdge(json, parentData, childData, edge), options);
    }
    
    sortChildren(id, graph, options = {}) {
        return this.setData((json) => sortChildren(json, id, graph), options);
    }
    
    sortNodes(graph, options = {}) {
        return this.setData((json) => sortChildren(json, graph.id, graph), options);
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
