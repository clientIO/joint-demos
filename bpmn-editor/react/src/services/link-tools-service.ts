import { dia } from '@joint/plus';
import type { AppLink } from '../shapes/shapes-typing';

export default class LinkToolsService {

    toolsView?: dia.ToolsView;

    create(linkView: dia.LinkView) {

        this.remove();

        const model = linkView.model as AppLink;

        this.toolsView = new dia.ToolsView({
            tools: model.getLinkTools()
        });

        linkView.addTools(this.toolsView);
    }

    remove() {
        this.toolsView?.remove();
    }
}
