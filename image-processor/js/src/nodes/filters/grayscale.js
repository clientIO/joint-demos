import { util } from '@joint/plus';
import * as cv from '@techstark/opencv-js';
import { Node, calculateHeight } from '../node';
import { App } from '../../app';

export class Grayscale extends Node {
    
    constructor(attributes, options) {
        super(attributes, options);
        
        this.on('change', (el, options) => {
            if (!options.inspector && !options.commandManager)
                return;
            
            if (options.propertyPath === 'properties/keepAlpha') {
                App.processor.process(this.id);
            }
        });
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Grayscale',
            name: 'Greyscale',
            group: 'filters',
            properties: {
                keepAlpha: true
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
                    name: 'Keep alpha',
                    type: 'boolean',
                    property: 'keepAlpha'
                }],
            outputSettings: [{
                    name: 'Image',
                    type: 'image',
                }]
        }, defaults);
    }
    
    async action() {
        const { image, keepAlpha } = this.properties;
        
        if (!image)
            return [null];
        
        try {
            const result = new cv.Mat();
            const channels = new cv.MatVector;
            cv.split(image, channels);
            const grayscale = new cv.Mat();
            cv.cvtColor(image, grayscale, cv.COLOR_RGBA2GRAY);
            if (keepAlpha) {
                channels.set(0, grayscale);
                channels.set(1, grayscale);
                channels.set(2, grayscale);
                cv.merge(channels, result);
            }
            else {
                cv.cvtColor(grayscale, result, cv.COLOR_GRAY2RGBA);
            }
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
                grayscale: {
                    label: 'Grayscale',
                    index: 2
                }
            },
            inputs: {
                properties: {
                    keepAlpha: {
                        type: 'toggle',
                        label: 'Keep alpha',
                        group: 'grayscale',
                    }
                }
            }
        }, nodeConfig);
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['properties/keepAlpha']);
    }
}
