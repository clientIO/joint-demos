import { dia } from '@joint/plus';
import { type AppElement } from './shapes-typing';
import type { DOMElement } from '@joint/core/types/joint';

export class LabelElementView extends dia.ElementView<AppElement> {

    labelNode: SVGElement | null = null;

    appendLabelNode() {
        const labelNode = this.labelNode;
        if (!labelNode) return this;
        const layer = this.paper?.getLayerView('labels');
        if (!layer) return this;
        layer.insertSortedNode(labelNode, this.model.z());
        labelNode.setAttribute('model-id', `${this.model.id}`);
        return this;
    }

    updateLabelNodeTransformation() {
        const labelNode = this.labelNode;
        if (!labelNode) return this;
        const bbox = this.model.getBBox();
        labelNode.setAttribute('transform', `translate(${bbox.x}, ${bbox.y})`);
        return this;
    }

    findLabelNode() {
        const labelSelector = this.model.labelSelector;
        if (!labelSelector) return;
        this.labelNode = this.findNode(labelSelector) as SVGElement;
    }

    setLabelNodeDisplay(isVisible: boolean) {
        const labelNode = this.labelNode;
        if (!labelNode) return this;

        if (isVisible) {
            labelNode.removeAttribute('display');
        } else {
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

    update(element?: DOMElement, renderingOnlyAttrs?: { [key: string]: any; } | undefined): void {
        super.update(element, renderingOnlyAttrs);

        // If the node doesn't exist, there is no need to toggle its display
        if (!this.labelNode) return;
        const labelPath = this.model.labelPath;
        const label = this.model.attr(labelPath);

        this.setLabelNodeDisplay(Boolean(label));
    }

    protected onMount(isInitialMount: boolean) {
        super.onMount(isInitialMount);
        // Sort the label by its z-index
        this.appendLabelNode();
        return this;
    }

    protected onDetach(): void {
        super.onDetach();
        this.labelNode?.remove();
    }

    protected onRemove(): void {
        super.onRemove();
        this.labelNode?.remove();
    }

    protected updateTransformation() {
        super.updateTransformation();
        // Update the label node transformation.
        this.updateLabelNodeTransformation();
        return this;
    }
}
