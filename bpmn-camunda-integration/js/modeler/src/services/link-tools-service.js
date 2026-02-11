import { dia } from '@joint/plus';

export default class LinkToolsService {
    
    create(linkView) {
        
        this.remove();
        
        const model = linkView.model;
        
        this.toolsView = new dia.ToolsView({
            tools: model.getLinkTools()
        });
        
        linkView.addTools(this.toolsView);
    }
    
    remove() {
        var _a;
        (_a = this.toolsView) === null || _a === void 0 ? void 0 : _a.remove();
    }
}
