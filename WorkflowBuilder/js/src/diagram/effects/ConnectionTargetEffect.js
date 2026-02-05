import { dia } from '@joint/plus';
import { Attribute } from '../const';

export default class ConnectionTargetEffect extends dia.HighlighterView {
    
    preinitialize() {
        this.UPDATABLE = false;
        this.MOUNTABLE = false;
    }
    
    highlight(view, node) {
        node.classList.add('connection-target');
        
        const model = view.model;
        if (!model.get(Attribute.Outline))
            return;
        
        const outlineNode = model;
        
        outlineNode.attr('outline', outlineNode.getHoverOutlineAttributes());
    }
    
    unhighlight(view, node) {
        node.classList.remove('connection-target');
        
        const model = view.model;
        if (!model.get(Attribute.Outline))
            return;
        
        const outlineNode = model;
        
        outlineNode.attr('outline', outlineNode.getDefaultOutlineAttributes());
    }
}
