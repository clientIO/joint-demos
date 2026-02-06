import type { dia, ui } from '@joint/plus';
import { util } from '@joint/plus';
import type { ActionResult, NodeAttributes } from '../node';
import { Node, calculateHeight } from '../node';
import * as cv from '@techstark/opencv-js';
import { App } from '../../app';
export class Mirror extends Node {

    constructor(attributes?: NodeAttributes, options?: dia.Graph.Options) {
        super(attributes, options);

        this.on('change', (el, options) => {
            if (!options.inspector && !options.commandManager) return;

            if (options.propertyPath === 'properties/direction') {
                App.processor.process(this.id);
            }
        });
    }

    defaults(): NodeAttributes {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Mirror',
            name: 'Mirror',
            group: 'transform',
            properties: {
                direction: 'horizontal',
            },
            size: {
                width: 120,
                height: calculateHeight(1)
            },
            inputSettings: [{
                name: 'Image',
                type: 'image',
                property: 'image'
            }],
            outputSettings: [{
                name: 'Image',
                type: 'image',
            }]
        }, defaults) as NodeAttributes;
    }

    async action(): Promise<ActionResult> {
        const { image, direction }: { image: cv.Mat, direction: string } = this.properties;

        if (!image) return [null];

        try {
            const result = new cv.Mat();

            switch (direction) {
                case 'horizontal':
                    cv.flip(image, result, 1);
                    break;
                case 'vertical':
                    cv.flip(image, result, 0);
                    break;
                case 'both':
                    cv.flip(image, result, -1);
                    break;
                default:
                    cv.flip(image, result, 1);
            }
            return [result];
        } catch {
            return [null];
        }
    }

    getInspectorConfig(): ui.Inspector.Options {
        const nodeConfig = super.getInspectorConfig();
        return util.defaultsDeep({
            groups: {
                mirror: {
                    label: 'Mirror',
                    index: 2
                }
            },
            inputs: {
                properties: {
                    direction: {
                        type: 'select-box',
                        label: 'Direction',
                        width: '204',
                        options: [{
                            content: 'horizontal'
                        }, {
                            content: 'vertical'
                        }, {
                            content: 'both'
                        }],
                        group: 'grayscale'
                    },
                }
            }
        }, nodeConfig);
    }

    getFileAttributes(): string[] {
        return super.getFileAttributes().concat(['properties/direction']);
    }
}
