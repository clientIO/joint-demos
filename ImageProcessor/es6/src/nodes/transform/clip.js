var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
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
            catch (_a) {
                return [null];
            }
        });
    }
}
