import { Node, NodeView } from '../node';
import { util } from '@joint/plus';

export class BooleanInputView extends NodeView {
    
    events() {
        return {
            ...super.events(),
            'change input': (evt) => { this.onInputChange(evt); }
        };
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
    
    async action() {
        return [];
    }
    
    getCurrentData() {
        return [this.attr('input/props/checked')];
    }
    
    getFileAttributes() {
        return super.getFileAttributes().concat(['attrs/input/props/checked']);
    }
}
