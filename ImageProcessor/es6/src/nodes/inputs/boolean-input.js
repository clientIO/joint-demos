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

export class BooleanInputView extends NodeView {
    
    events() {
        return Object.assign(Object.assign({}, super.events()), { 'change input': (evt) => { this.onInputChange(evt); } });
    }
    
    onInputChange(evt) {
        this.model.attr('input/props/checked', evt.target.checked, { input: true });
    }
}

export class BooleanInput extends Node {
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        if (this.attr('input/props/checked') != null) {
            this.updateCurrentData();
        }
        
        this.on('change:attrs', (_input, _attrs, options) => {
            if (options.propertyPath === 'attrs/input/props/checked') {
                this.updateCurrentData();
            }
        });
    }
    
    preinitialize() {
        super.preinitialize();
        const markup = util.svg /* xml */ `
            <foreignObject @selector="foreignObject">
                <div @selector="content" xmlns="http://www.w3.org/1999/xhtml">
                    <input type="checkbox" class="toggle" @selector="input"/>
                    <span><i></i></span>
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
            type: 'processor.BooleanInput',
            name: 'Boolean',
            group: 'inputs',
            outputSettings: [{
                    name: 'Boolean',
                    type: 'boolean',
                    defaultValue: true
                }],
            attrs: {
                foreignObject: {
                    width: 'calc(w-80)',
                    height: 'calc(h-32)',
                    x: 15,
                    y: 29,
                },
                input: {
                    checked: true
                }
            }
        }, defaults);
    }
    
    action() {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
    
    getCurrentData() {
        return [this.attr('input/props/checked')];
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['attrs/input/props/checked']);
    }
}
