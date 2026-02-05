import { linkTools } from '@joint/plus';
import { insertToolBodyAttributes, insertToolIconAttributes } from '../theme';

export default class InsertNodeTool extends linkTools.Button {
    
    preinitialize(options) {
        this.name = 'insert-node-tool';
        this.attributes = {
            cursor: 'pointer'
        };
        this.children = [{
                tagName: 'circle',
                attributes: Object.assign({}, insertToolBodyAttributes)
            }, {
                tagName: 'path',
                attributes: Object.assign({}, insertToolIconAttributes)
            }];
        this.options = Object.assign({ distance: '50%' }, options);
    }
    
    initialize() {
        super.initialize();
        this.el.classList.add('fade-in');
    }
}
