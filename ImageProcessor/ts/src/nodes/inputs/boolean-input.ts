import type { ActionResult, NodeAttributes } from '../node';
import { Node, NodeView } from '../node';
import type { mvc, dia } from '@joint/plus';
import { util } from '@joint/plus';

export class BooleanInputView extends NodeView {

    events(): mvc.EventsHash {
        return {
            ...super.events(),
            'change input': (evt: dia.Event) => { this.onInputChange(evt); }
        };
    }

    onInputChange(evt: dia.Event) {
        this.model.attr('input/props/checked', evt.target.checked, { input: true });
    }
}

export class BooleanInput extends Node {

    initialize(attributes: NodeAttributes, options: any): void {
        super.initialize(attributes, options);

        if (this.attr('input/props/checked') != null) {
            this.updateCurrentData();
        }

        this.on('change:attrs', (_input: BooleanInput, _attrs: any, options: any) => {
            if (options.propertyPath === 'attrs/input/props/checked') {
                this.updateCurrentData();
            }
        });
    }

    preinitialize() {
        super.preinitialize();
        const markup: dia.MarkupJSON = util.svg/* xml */`
            <foreignObject @selector="foreignObject">
                <div @selector="content" xmlns="http://www.w3.org/1999/xhtml">
                    <input type="checkbox" class="toggle" @selector="input"/>
                    <span><i></i></span>
                </div>
            </foreignObject>
        `;

        this.markup = (<dia.MarkupJSON>this.markup).concat(markup);
    }

    defaults(): NodeAttributes {
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
        }, defaults) as NodeAttributes;
    }

    async action(): Promise<ActionResult> {
        return [];
    }

    getCurrentData(): any[] {
        return [this.attr('input/props/checked')];
    }

    getFileAttributes(): string[] {
        return super.getFileAttributes().concat(['attrs/input/props/checked']);
    }
}
