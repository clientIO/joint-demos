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
import { App } from '../../app';
export class Blur extends Node {
    defaults() {
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
        }, defaults);
    }
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
            const { image, radius } = this.properties;
            
            if (!image)
                return [null];
            
            try {
                const result = yield App.cvService.do('blur', [image, radius]);
                return [result];
            }
            catch (_a) {
                return [null];
            }
        });
    }
}
