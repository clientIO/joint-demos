import type { ActionResult, NodeAttributes } from '../node';
import { Node, NodeView } from '../node';
import type { mvc, dia } from '@joint/plus';
import { util } from '@joint/plus';

export class NumberInputView extends NodeView {

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

export class NumberInput extends Node {

    initialize(attributes: NodeAttributes, options: any): void {
        super.initialize(attributes, options);

        if (this.attr('input/props/value') != null) {
            this.updateCurrentData();
        }

        this.on('change:attrs', (_input: NumberInput, _attrs: any, options: any) => {
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
                    <input type="number" @selector="input"/>
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
        }, defaults) as NodeAttributes;
    }

    async action(_inputs: any[] = []): Promise<ActionResult> {
        return [];
    }

    getCurrentData(): any[] {
        return [Number(this.attr('input/props/value'))];
    }

    getFileAttributes(): string[] {
        return super.getFileAttributes().concat(['attrs/input/props/value']);
    }
}
