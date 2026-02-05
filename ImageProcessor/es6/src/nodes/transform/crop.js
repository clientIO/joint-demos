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
export class Crop extends Node {
    
    constructor(attributes, options) {
        super(attributes, options);
        
        this.on('change', (el, options) => {
            if (!options.inspector && !options.commandManager)
                return;
            
            if (options.propertyPath === 'properties/width' ||
                options.propertyPath === 'properties/height' ||
                options.propertyPath === 'properties/x' ||
                options.propertyPath === 'properties/y') {
                App.processor.process(this.id);
            }
        });
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Crop',
            name: 'Crop',
            group: 'transform',
            properties: {
                width: 200,
                height: 200,
                x: 0,
                y: 0,
            },
            size: {
                width: 120,
                height: calculateHeight(5)
            },
            inputSettings: [{
                    name: 'Image',
                    type: 'image',
                    property: 'image'
                }, {
                    name: 'Width',
                    type: 'number',
                    property: 'width',
                    defaultValue: 200
                }, {
                    name: 'Height',
                    type: 'number',
                    property: 'height',
                    defaultValue: 200
                }, {
                    name: 'X',
                    type: 'number',
                    property: 'x',
                    defaultValue: 0
                }, {
                    name: 'Y',
                    type: 'number',
                    property: 'y',
                    defaultValue: 0
                }],
            outputSettings: [{
                    name: 'Image',
                    type: 'image',
                }]
        }, defaults);
    }
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
            const { image, width, height, x, y } = this.properties;
            
            if (!image)
                return [null];
            
            try {
                const roi = new cv.Rect(x, y, width, height);
                const result = image.roi(roi);
                
                return [result];
            }
            catch (_a) {
                return [null];
            }
        });
    }
    
    getInspectorConfig() {
        const nodeConfig = super.getInspectorConfig();
        return util.defaultsDeep({
            groups: {
                crop: {
                    label: 'Crop',
                    index: 2
                }
            },
            inputs: {
                properties: {
                    width: {
                        type: 'number',
                        label: 'Width',
                        group: 'crop'
                    },
                    height: {
                        type: 'number',
                        label: 'Height',
                        group: 'crop'
                    },
                    x: {
                        type: 'number',
                        label: 'X',
                        group: 'crop'
                    },
                    y: {
                        type: 'number',
                        label: 'Y',
                        group: 'crop'
                    },
                }
            }
        }, nodeConfig);
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['properties/width', 'properties/height', 'properties/x', 'properties/y']);
    }
}
