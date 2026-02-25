import { Node, NodeView } from '../node';
import { util } from '@joint/plus';

import type { ActionResult, NodeAttributes } from '../node';
import type { mvc, dia } from '@joint/plus';
export class TextInputView extends NodeView {

    events(): mvc.EventsHash {
        return {
            ...super.events(),
            'change input': (evt: dia.Event) => { this.onInputChange(evt); }
        };
    }

    onInputChange(evt: dia.Event) {
        this.model.attr('input/props/value', evt.target.value, { input: true });
    }
}

export class TextInput extends Node {

    initialize(attributes: NodeAttributes, options: dia.Graph.Options): void {
        super.initialize(attributes, options);

        if (this.attr('input/props/value') != null) {
            this.updateCurrentData();
        }

        this.on('change:attrs', (_input: TextInput, _attrs: dia.Cell.Attributes, options: dia.Cell.Options) => {
            if (options.propertyPath === 'attrs/input/props/value') {
                this.updateCurrentData();
            }
        });
    }

    preinitialize() {
        super.preinitialize();
        const markup: dia.MarkupJSON = util.svg/* xml */`
            <foreignObject @selector="foreignObject">
                <div @selector="content" xmlns="http://www.w3.org/1999/xhtml">
                    <input type="text" @selector="input" />
                </div>
            </foreignObject>
        `;

        this.markup = (<dia.MarkupJSON>this.markup).concat(markup);
    }

    defaults(): NodeAttributes {
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
        }, defaults) as NodeAttributes;
    }

    async action(_inputs: unknown[] = []): Promise<ActionResult> {
        return [];
    }

    getCurrentData(): unknown[] {
        return [this.attr('input/props/value')];
    }

    getFileAttributes(): string[] {
        return super.getFileAttributes().concat(['attrs/input/props/value']);
    }
}
