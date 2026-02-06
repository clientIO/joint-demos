import { util } from '@joint/plus';
import type { ActionResult, NodeAttributes } from '../node';
import { Node, calculateHeight } from '../node';
import type * as cv from '@techstark/opencv-js';
export class Sepia extends Node {
    defaults(): NodeAttributes {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Sepia',
            name: 'Sepia',
            group: 'filters',
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
        const { image }: { image: cv.Mat } = this.properties;

        if (!image) return [null];

        try {
            const result = image.clone();

            for (let i = 0; i < result.rows; i++) {
                for (let j = 0; j < result.cols; j++) {
                    let pixel = result.ucharPtr(i,j);
                    const r = pixel[0];
                    const g = pixel[1];
                    const b = pixel[2];

                    const v = 0.3 * r + 0.59 * g + 0.11 * b;
                    const p = [v + 40, v + 20, v - 20];

                    const pNorm = p.map(val => {
                        if (val < 0) {
                            return 0;
                        }
                        if (val > 255) {
                            return 255;
                        }
                        return val;
                    });

                    pixel[0] = pNorm[0];
                    pixel[1] = pNorm[1];
                    pixel[2] = pNorm[2];
                }
            }
            return [result];
        } catch {
            return [null];
        }
    }
}
