import { dia } from '@joint/plus';

export class LabelElementView extends dia.ElementView {
    
    labelNode = null;
    
    appendLabelNode() {
        const labelNode = this.labelNode;
        if (!labelNode)
            return this;
        const layer = this.paper?.getLayerView('labels');
        if (!layer)
            return this;
        layer.insertSortedNode(labelNode, this.model.z());
        labelNode.setAttribute('model-id', `${this.model.id}`);
        return this;
    }
    
    updateLabelNodeTransformation() {
        const labelNode = this.labelNode;
        if (!labelNode)
            return this;
        const bbox = this.model.getBBox();
        labelNode.setAttribute('transform', `translate(${bbox.x}, ${bbox.y})`);
        return this;
    }
    
    findLabelNode() {
        const labelSelector = this.model.labelSelector;
        if (!labelSelector)
            return;
        this.labelNode = this.findNode(labelSelector);
    }
    
    setLabelNodeDisplay(isVisible) {
        const labelNode = this.labelNode;
        if (!labelNode)
            return this;
        
        if (isVisible) {
            labelNode.removeAttribute('display');
        }
        else {
            labelNode.setAttribute('display', 'none');
        }
        
        return this;
    }
    
    render() {
        super.render();
        this.findLabelNode();
        this.appendLabelNode();
        this.updateLabelNodeTransformation();
        return this;
    }
    
    update(element, renderingOnlyAttrs) {
        super.update(element, renderingOnlyAttrs);
        
        // If the node doesn't exist, there is no need to toggle its display
        if (!this.labelNode)
            return;
        const labelPath = this.model.labelPath;
        const label = this.model.attr(labelPath);
        
        this.setLabelNodeDisplay(Boolean(label));
    }
    
    onMount(isInitialMount) {
        super.onMount(isInitialMount);
        // Sort the label by its z-index
        this.appendLabelNode();
        return this;
    }
    
    onDetach() {
        super.onDetach();
        this.labelNode?.remove();
    }
    
    onRemove() {
        super.onRemove();
        this.labelNode?.remove();
    }
    
    updateTransformation() {
        super.updateTransformation();
        // Update the label node transformation.
        this.updateLabelNodeTransformation();
        return this;
    }
}
