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
import { App } from '../../app';

export class FillContours extends Node {
    
    constructor(attributes, options) {
        super(attributes, options);
        
        this.on('change', (el, options) => {
            if (!options.inspector && !options.commandManager)
                return;
            
            if (options.propertyPath === 'properties/color') {
                App.processor.process(this.id);
            }
        });
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.FillContours',
            name: 'Fill contours',
            group: 'transform',
            properties: {
                color: { r: 255, g: 255, b: 255 }
            },
            size: {
                width: 120,
                height: calculateHeight(2)
            },
            inputSettings: [{
                    name: 'Image',
                    type: 'image',
                    property: 'image'
                }, {
                    name: 'Color',
                    type: 'color',
                    property: 'color',
                    defaultValue: { r: 255, g: 255, b: 255 }
                }],
            outputSettings: [{
                    name: 'Image',
                    type: 'image',
                }]
        }, defaults);
    }
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
            const { image, color } = this.properties;
            
            if (!image)
                return [null];
            
            try {
                const gray = image.clone();
                cv.cvtColor(gray, gray, cv.COLOR_RGBA2GRAY, 0);
                const thresh = new cv.Mat();
                cv.threshold(gray, thresh, 127, 255, cv.THRESH_BINARY);
                
                let contours = new cv.MatVector();
                let h = new cv.Mat();
                cv.findContours(thresh, contours, h, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
                
                const result = image.clone();
                cv.drawContours(result, contours, -1, new cv.Scalar(color.r, color.g, color.b, 255), -1, cv.LINE_8);
                return [result];
            }
            catch (_a) {
                return [null];
            }
        });
    }
}
