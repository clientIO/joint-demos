import { util } from '@joint/plus';
import { Node, calculateHeight } from '../node';
import { App } from '../../app';
export class Blur extends Node {
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Blur',
            name: 'Blur',
            group: 'filters',
            size: {
                width: 120,
                height: calculateHeight(2)
            },
            inputSettings: [{
                    name: 'Image',
                    type: 'image',
                    property: 'image'
                }, {
                    name: 'Radius',
                    type: 'number',
                    property: 'radius',
                    defaultValue: 10
                }],
            outputSettings: [{
                    name: 'Image',
                    type: 'image',
                }]
        }, defaults);
    }
    
    async action() {
        const { image, radius } = this.properties;
        
        if (!image)
            return [null];
        
        try {
            const result = await App.cvService.do('blur', [image, radius]);
            return [result];
        }
        catch {
            return [null];
        }
    }
}
