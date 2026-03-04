import { util } from '@joint/plus';
import { Node, calculateHeight } from '../node';
import { App } from '../../app';

import type { ActionResult, NodeAttributes } from '../node';
import type * as cv from '@techstark/opencv-js';
export class Blur extends Node {
    defaults(): NodeAttributes {
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
        }, defaults) as NodeAttributes;
    }

    async action(): Promise<ActionResult> {
        const { image, radius } = this.properties as { image: cv.Mat, radius: number };

        if (!image) return [null];

        try {
            const result = await App.cvService.do('blur', [image, radius]) as cv.Mat;
            return [result];
        } catch {
            return [null];
        }
    }
}
