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
export class Invert extends Node {
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Invert',
            name: 'Invert',
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
        }, defaults);
    }
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
            const { image } = this.properties;
            
            if (!image)
                return [null];
            
            try {
                const result = new cv.Mat();
                const channels = new cv.MatVector;
                cv.split(image, channels);
                const alpha = channels.get(3);
                const negatedImage = new cv.Mat();
                const negateMatrix = new cv.Mat(image.rows, image.cols, image.type(), new cv.Scalar(255, 255, 255, 255));
                cv.subtract(negateMatrix, image, negatedImage);
                const negatedChannels = new cv.MatVector;
                cv.split(negatedImage, negatedChannels);
                negatedChannels.set(3, alpha);
                cv.merge(negatedChannels, result);
                return [result];
            }
            catch (_a) {
                return [null];
            }
        });
    }
}
