import { util } from '@joint/plus';
import { Node, calculateHeight } from '../node';

export class Division extends Node {
    
    defaults() {
        const defaults = super.defaults();
        return util.defaultsDeep({
            type: 'processor.Division',
            name: 'Div',
            group: 'math',
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
        }, defaults);
    }
    
    async action() {
        const { a, b } = this.properties;
        
        const result = a / b;
        this.set('result', result);
        
        return [result];
    }
    
    getInspectorConfig() {
        const nodeConfig = super.getInspectorConfig();
        return util.defaultsDeep({
            groups: {
                division: {
                    label: 'Division',
                    index: 2
                }
            },
            inputs: {
                result: {
                    type: 'number',
                    label: 'Result',
                    group: 'division',
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
