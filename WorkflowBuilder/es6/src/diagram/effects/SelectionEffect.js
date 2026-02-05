import { dia } from '@joint/plus';
import { Attribute } from '../const';

export default class SelectionEffect extends dia.HighlighterView {
    
    preinitialize() {
        this.UPDATABLE = false;
        this.MOUNTABLE = false;
    }
    
    highlight(view, node) {
        node.classList.add('selected');
        
        const model = view.model;
        if (!model.get(Attribute.Outline))
            return;
        
        const outlineNode = model;
        
        outlineNode.attr('outline', outlineNode.getSelectedOutlineAttributes());
    }
    
    unhighlight(view, node) {
        node.classList.remove('selected');
        
        const model = view.model;
        if (!model.get(Attribute.Outline))
            return;
        
        const outlineNode = model;
        
        outlineNode.attr('outline', outlineNode.getDefaultOutlineAttributes());
    }
}
