var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Node, NodeView } from '../node';
import { util } from '@joint/plus';

export class NumberInputView extends NodeView {
    
    events() {
        return Object.assign(Object.assign({}, super.events()), { 'change input': (evt) => { this.onInputChange(evt); } });
    }
    
    onInputChange(evt) {
        this.model.attr('input/props/value', evt.target.value, { input: true });
    }
}

export class NumberInput extends Node {
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        if (this.attr('input/props/value') != null) {
            this.updateCurrentData();
        }
        
        this.on('change:attrs', (_input, _attrs, options) => {
            if (options.propertyPath === 'attrs/input/props/value') {
                this.updateCurrentData();
            }
        });
    }
    
    preinitialize() {
        super.preinitialize();
        const markup = util.svg /* xml */ `
            <foreignObject @selector="foreignObject">
                <div @selector="content" xmlns="http://www.w3.org/1999/xhtml">
                    <input type="number" @selector="input"/>
                </div>
            </foreignObject>
        `;
        
        this.markup = this.markup.concat(markup);
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            size: {
                width: 150
            },
            type: 'processor.NumberInput',
            name: 'Number',
            group: 'inputs',
            outputSettings: [{
                    name: 'Number',
                    type: 'number',
                    defaultValue: 0
                }],
            attrs: {
                foreignObject: {
                    width: 'calc(w-80)',
                    height: 'calc(h-32)',
                    x: 15,
                    y: 29,
                },
                input: {
                    props: {
                        value: 0
                    }
                }
            }
        }, defaults);
    }
    
    action() {
        return __awaiter(this, arguments, void 0, function* (_inputs = []) {
            return [];
        });
    }
    
    getCurrentData() {
        return [Number(this.attr('input/props/value'))];
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['attrs/input/props/value']);
    }
}
