import { dia } from '@joint/plus';

export default class SystemNode extends dia.Element {
    
    static type;
    
    defaults() {
        // Make sure the defaults are defined for
        // easy ES class extension.
        return {
            ...super.defaults,
        };
    }
    
    getDataPath() {
        return `${this.id}`;
    }
    
    getLabelsRelativeRects() {
        return [];
    }
}
