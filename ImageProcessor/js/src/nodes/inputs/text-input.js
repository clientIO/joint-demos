import { Node, NodeView } from '../node';
import { util } from '@joint/plus';
export class TextInputView extends NodeView {
    
    events() {
        return {
            ...super.events(),
            'change input': (evt) => { this.onInputChange(evt); }
        };
    }
    
    onInputChange(evt) {
        this.model.attr('input/props/value', evt.target.value, { input: true });
    }
}

export class TextInput extends Node {
    
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
                    <input type="text" @selector="input" />
                </div>
            </foreignObject>
        `;
        
        this.markup = this.markup.concat(markup);
    }
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            size: {
                width: 250
            },
            type: 'processor.TextInput',
            name: 'Text',
            group: 'inputs',
            outputSettings: [{
                    name: 'Text',
                    type: 'string',
                    defaultValue: ''
                }],
            attrs: {
                foreignObject: {
                    width: 'calc(w-60)',
                    height: 'calc(h-32)',
                    x: 15,
                    y: 29
                },
                input: {
                    props: {
                        value: ''
                    }
                }
            }
        }, defaults);
    }
    
    async action(_inputs = []) {
        return [];
    }
    
    getCurrentData() {
        return [this.attr('input/props/value')];
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['attrs/input/props/value']);
    }
}
