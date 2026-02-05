import type { dia } from '@joint/plus';
import { ui } from '@joint/plus';
import toolbarConfig from '../configs/toolbar-config';
import ToolbarActionsController from '../controllers/toolbar-actions-controller';

export default class ToolbarService {

    toolbar?: ui.Toolbar;
    toolbarActionsController?: ToolbarActionsController;

    constructor(private readonly toolbarElement: HTMLDivElement) { }

    create(paper: dia.Paper, paperScroller: ui.PaperScroller, commandManager: dia.CommandManager) {
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
