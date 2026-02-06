import { shapes, util } from '@joint/core';

export class Milestone extends shapes.standard.Rectangle {
    
    defaults() {
        return util.defaultsDeep({
            type: 'timeline.Milestone',
            size: { width: 72, height: 38 },
            attrs: {
                body: {
                    rx: 18,
                    ry: 18,
                    stroke: null,
                    fill: '#30608F',
                    cursor: 'pointer'
                },
                label: {
                    fill: '#FFFFFF',
                    fontFamily: 'Nunito Sans',
                    fontWeight: 'bold',
                    fontSize: 19,
                    pointerEvents: 'none'
                }
            }
        }, super.defaults);
    }
    
    isConnectionValid(type) {
        return type === 'timeline.Category';
    }
    
    getEditableFields() {
        return [];
    }
    
    static create(id) {
        return new Milestone({
            id: id,
            attrs: {
                label: {
                    text: String(id)
                }
            }
        });
    }
}
