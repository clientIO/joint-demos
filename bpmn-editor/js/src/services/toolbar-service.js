import { ui } from '@joint/plus';
import toolbarConfig from '../configs/toolbar-config';
import ToolbarActionsController from '../controllers/toolbar-actions-controller';

export default class ToolbarService {
    toolbarElement;
    
    toolbar;
    toolbarActionsController;
    
    constructor(toolbarElement) {
        this.toolbarElement = toolbarElement;
    }
    
    create(paper, paperScroller, commandManager) {
        const { tools, groups } = toolbarConfig;
        
        this.toolbar = new ui.Toolbar({
            tools,
            groups,
            autoToggle: true,
            el: this.toolbarElement,
            references: {
                commandManager
            }
        });
        
        this.toolbar.render();
        
        this.toolbarActionsController = new ToolbarActionsController({ paper, paperScroller, toolbar: this.toolbar, commandManager });
        this.toolbarActionsController.startListening();
    }
}
