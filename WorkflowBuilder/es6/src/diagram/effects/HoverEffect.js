import { dia } from '@joint/plus';
import { Attribute } from '../const';

export default class HoverEffect extends dia.HighlighterView {
    
    preinitialize() {
        this.UPDATABLE = false;
        this.MOUNTABLE = false;
    }
    
    highlight(view, node) {
        node.classList.add('hover');
        
        // Do not override selection outline with hover outline
        if (node.classList.contains('selected'))
            return;
        
        const model = view.model;
        if (!model.get(Attribute.Outline))
            return;
        
        const outlineNode = model;
        
        outlineNode.attr('outline', outlineNode.getHoverOutlineAttributes());
    }
    
    unhighlight(view, node) {
        node.classList.remove('hover');
        
        // Do not override selection outline with hover outline
        if (node.classList.contains('selected'))
            return;
        
        const model = view.model;
        if (!model.get(Attribute.Outline))
            return;
        
        const outlineNode = model;
        
        outlineNode.attr('outline', outlineNode.getDefaultOutlineAttributes());
    }
}
