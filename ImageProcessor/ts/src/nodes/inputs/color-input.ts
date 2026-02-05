import type { ActionResult, NodeAttributes } from '../node';
import { Node, NodeView } from '../node';
import type { mvc, dia } from '@joint/plus';
import { util } from '@joint/plus';

export class ColorInputView extends NodeView {

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

export class ColorInput extends Node {

    initialize(attributes: NodeAttributes, options: any): void {
        super.initialize(attributes, options);

        if (this.attr('input/props/value') != null) {
            this.updateCurrentData();
        }

        this.on('change:attrs', (_input: ColorInput, _attrs: any, options: any) => {
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
                    <input type="color" @selector="input"/>
                </div>
            </foreignObject>
        `;

        this.markup = (<dia.MarkupJSON>this.markup).concat(markup);
    }

    defaults(): NodeAttributes {
        const defaults = super.defaults();
        return util.defaultsDeep({
            size: {
                width: 120,
                height: 60
            },
            type: 'processor.ColorInput',
            name: 'Color',
            group: 'inputs',
            outputSettings: [{
                name: 'Color',
                type: 'color',
                defaultValue: '#ffffff'
            }],
            attrs: {
                foreignObject: {
                    width: 'calc(w-60)',
                    height: 'calc(h-32)',
                    x: 15,
                    y: 29,
                },
                input: {
                    props: {
                        value: '#ffffff'
                    }
                }
            }
        }, defaults) as NodeAttributes;
    }

    async action(_inputs: any[] = []): Promise<ActionResult> {
        return [];
    }

    getCurrentData(): any[] {
        return [this.hexToRGB(this.attr('input/props/value'))];
    }

    getFileAttributes(): string[] {
        return super.getFileAttributes().concat(['attrs/input/props/value']);
    }
}
