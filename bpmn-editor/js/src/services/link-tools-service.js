import { dia } from '@joint/plus';

export default class LinkToolsService {
    
    toolsView;
    
    create(linkView) {
        
        this.remove();
        
        const model = linkView.model;
        
        this.toolsView = new dia.ToolsView({
            tools: model.getLinkTools()
        });
        
        linkView.addTools(this.toolsView);
    }
    
    remove() {
        this.toolsView?.remove();
    }
}
