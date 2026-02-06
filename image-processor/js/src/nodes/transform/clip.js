import { util } from '@joint/plus';
import { Node, calculateHeight } from '../node';
import * as cv from '@techstark/opencv-js';

export class Clip extends Node {
    
    constructor(attributes, options) {
        super(attributes, options);
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Clip',
            name: 'Clip',
            group: 'transform',
            size: {
                width: 120,
                height: calculateHeight(2)
            },
            inputSettings: [{
                    name: 'Image',
                    type: 'image',
                    property: 'image'
                }, {
                    name: 'Mask',
                    type: 'image',
                    property: 'mask'
                }],
            outputSettings: [{
                    name: 'Image',
                    type: 'image',
                }]
        }, defaults);
    }
    
    async action() {
        const { image, mask } = this.properties;
        
        if (!(image && mask))
            return [null];
        
        try {
            cv.resize(mask, mask, image.size(), 1, 1, cv.INTER_AREA);
            
            const grayMask = new cv.Mat();
            cv.cvtColor(mask, grayMask, cv.COLOR_RGBA2GRAY);
            
            const channels = new cv.MatVector();
            cv.split(image, channels);
            
            const result = new cv.Mat();
            channels.set(3, grayMask);
            cv.merge(channels, result);
            
            return [result];
            
        }
        catch {
            return [null];
        }
    }
}
