import { util } from '@joint/plus';
import { Node, calculateHeight } from '../node';
import * as cv from '@techstark/opencv-js';
import { App } from '../../app';

import type { dia } from '@joint/plus';
import type { ActionResult, NodeAttributes } from '../node';

export class FillContours extends Node {

    constructor(attributes?: NodeAttributes, options?: dia.Graph.Options) {
        super(attributes, options);

        this.on('change', (el, options) => {
            if (!options.inspector && !options.commandManager) return;

            if (options.propertyPath === 'properties/color') {
                App.processor.process(this.id);
            }
        });
    }

    defaults(): NodeAttributes {
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
        }, defaults) as NodeAttributes;
    }

    async action(): Promise<ActionResult> {
        const { image, color } = this.properties as { image: cv.Mat, color: { r: number; g: number; b: number } };

        if (!image) return [null];

        try {
            const gray = image.clone();
            cv.cvtColor(gray, gray, cv.COLOR_RGBA2GRAY, 0);
            const thresh = new cv.Mat();
            cv.threshold(gray, thresh, 127, 255, cv.THRESH_BINARY);

            const contours = new cv.MatVector();
            const h = new cv.Mat();
            cv.findContours(thresh, contours as unknown as cv.Mat, h, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            const result = image.clone();
            cv.drawContours(result, contours as unknown as cv.Mat, -1, new cv.Scalar(color.r, color.g, color.b, 255), -1, cv.LINE_8);
            return [result];
        } catch {
            return [null];
        }
    }
}
