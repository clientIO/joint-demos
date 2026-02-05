import { dia } from '@joint/plus';

export default class SystemNode extends dia.Element {
    
    defaults() {
        // Make sure the defaults are defined for
        // easy ES class extension.
        return Object.assign({}, super.defaults);
    }
    
    getDataPath() {
        return `${this.id}`;
    }
    
    getLabelsRelativeRects() {
        return [];
    }
}
