import type { ui } from '@joint/plus';
import { util } from '@joint/plus';
import type { ActionResult, NodeAttributes } from '../node';
import { Node, calculateHeight } from '../node';

export class Addition extends Node {

    defaults(): NodeAttributes {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Addition',
            name: 'Add',
            group: 'math',
            result: null,
            size: {
                width: 120,
                height: calculateHeight(2)
            },
            inputSettings: [{
                name: 'A',
                type: 'number',
                property: 'a',
                defaultValue: 0
            }, {
                name: 'B',
                type: 'number',
                property: 'b',
                defaultValue: 0
            }],
            outputSettings: [{
                name: 'Result',
                type: 'number',
            }]
        }, defaults) as NodeAttributes;
    }

    async action(): Promise<ActionResult> {
        const { a, b }: { a: number, b: number } = this.properties;

        const result = a + b;
        this.set('result', result);

        return [result];
    }

    getInspectorConfig(): ui.Inspector.Options {
        const nodeConfig = super.getInspectorConfig();
        return util.defaultsDeep({
            groups: {
                addition: {
                    label: 'Addition',
                    index: 2
                }
            },
            inputs: {
                result: {
                    type: 'number',
                    label: 'Result',
                    group: 'addition',
                    attrs: {
                        '.number': {
                            disabled: true
                        }
                    }
                },
            }
        }, nodeConfig);
    }
}
