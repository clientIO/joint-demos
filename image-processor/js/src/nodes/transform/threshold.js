import { util } from '@joint/plus';
import { Node, calculateHeight } from '../node';
import * as cv from '@techstark/opencv-js';
import { App } from '../../app';

export class Threshold extends Node {
    
    constructor(attributes, options) {
        super(attributes, options);
        
        this.on('change', (el, options) => {
            if (!options.inspector && !options.commandManager)
                return;
            
            if (options.propertyPath === 'properties/threshold' ||
                options.propertyPath === 'properties/value') {
                App.processor.process(this.id);
            }
        });
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Threshold',
            name: 'Threshold',
            group: 'transform',
            properties: {
                threshold: 127,
                value: 255
            },
            size: {
                width: 120,
                height: calculateHeight(3)
            },
            inputSettings: [{
                    name: 'Image',
                    type: 'image',
                    property: 'image'
                }, {
                    name: 'Threshold',
                    type: 'number',
                    property: 'threshold',
                    defaultValue: 127
                }, {
                    name: 'Value',
                    type: 'number',
                    property: 'value',
                    defaultValue: 255
                }],
            outputSettings: [{
                    name: 'Image',
                    type: 'image',
                }]
        }, defaults);
    }
    
    async action() {
        const { image, threshold, value } = this.properties;
        
        if (!image)
            return [null];
        
        try {
            const result = new cv.Mat();
            cv.threshold(image, result, threshold, value, cv.THRESH_BINARY);
            
            return [result];
        }
        catch {
            return [null];
        }
    }
    
    getInspectorConfig() {
        const nodeConfig = super.getInspectorConfig();
        return util.defaultsDeep({
            groups: {
                threshold: {
                    label: 'Threshold',
                    index: 2
                }
            },
            inputs: {
                properties: {
                    threshold: {
                        type: 'number',
                        label: 'Threshold',
                        group: 'threshold'
                    },
                    value: {
                        type: 'number',
                        label: 'Value',
                        group: 'threshold'
                    }
                }
            }
        }, nodeConfig);
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['properties/threshold', 'properties/value']);
    }
}
