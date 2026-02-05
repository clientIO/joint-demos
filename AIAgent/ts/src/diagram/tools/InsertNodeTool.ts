import { linkTools } from '@joint/plus';
import { buttonBodyAttributes, buttonIconAttributes } from '../theme';

export default class InsertNodeTool extends linkTools.Button {

    preinitialize(options?: linkTools.Button.Options) {
        this.name = 'insert-node-tool';
        this.attributes = {
            cursor: 'pointer',
        };
        /** Note: it mimics the SystemButton plus icon */
        this.children = [{
            tagName: 'circle',
            className: 'add-button-body',
            attributes: { ...buttonBodyAttributes  }
        }, {
            tagName: 'path',
            className: 'add-button-icon',
            attributes: { ...buttonIconAttributes  }
        }];
        this.options = {
            distance: '50%',
            ...options,
        };
    }

    initialize() {
        super.initialize();
        this.el.classList.add('fade-in');
    }
}
