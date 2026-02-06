import type { dia, ui } from '@joint/plus';
import { util } from '@joint/plus';
import type { ActionResult, NodeAttributes } from '../node';
import { Node, calculateHeight } from '../node';
import * as cv from '@techstark/opencv-js';
import { App } from '../../app';

export class Blend extends Node {

    constructor(attributes?: NodeAttributes, options?: dia.Graph.Options) {
        super(attributes, options);

        this.on('change', (el, options) => {
            if (!options.inspector) return;

            if (options.propertyPath === 'properties/ratio') {
                App.processor.process(this.id);
            }
        });
    }

    defaults(): NodeAttributes {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Blend',
            name: 'Blend',
            group: 'transform',
            properties: {
                ratio: 0.5,
            },
            size: {
                width: 120,
                height: calculateHeight(2)
            },
            inputSettings: [{
                name: 'Image 1',
                type: 'image',
                property: 'image1'
            }, {
                name: 'Image 2',
                type: 'image',
                property: 'image2'
            }],
            outputSettings: [{
                name: 'Image',
                type: 'image',
            }]
        }, defaults) as NodeAttributes;
    }

    async action(): Promise<ActionResult> {
        const { image1, image2, ratio }: { image1: cv.Mat, image2: cv.Mat, ratio: number } = this.properties;

        if (!(image1 && image2)) return [null];

        try {
            const resizedImage2 = new cv.Mat();
            cv.resize(image2, resizedImage2, image1.size(), 1, 1, cv.INTER_AREA);

            const result = new cv.Mat();
            cv.addWeighted(image1, 1 - ratio, resizedImage2, ratio, 0, result);
            return [result];

        } catch {
            return [null];
        }
    }

    getInspectorConfig(): ui.Inspector.Options {
        const nodeConfig = super.getInspectorConfig();
        return util.defaultsDeep({
            groups: {
                blend: {
                    label: 'Blend',
                    index: 2
                }
            },
            inputs: {
                properties: {
                    ratio: {
                        type: 'range',
                        min: 0,
                        max: 1,
                        step: 0.01,
                        unit: '',
                        label: 'Ration',
                        group: 'blend'
                    }
                }
            }
        }, nodeConfig);
    }

    getFileAttributes(): string[] {
        return super.getFileAttributes().concat(['properties/ratio']);
    }
}
