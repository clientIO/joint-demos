import Node from './Node';
import { Attribute } from '../const';

/** An abstract node with a label. */
export default class LabeledNode extends Node {
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        this.updateLabel();
        this.on(`change:${Attribute.Label}`, () => this.updateLabel());
    }
    
    updateLabel() {
        // If no label is set or the label is an empty string,
        // display the default label.
        this.attr(['label', 'text'], this.getLabel() || this.getDefaultLabel());
    }
    
    getLabel() {
        return this.get(Attribute.Label) ?? null;
    }
    
    getDefaultLabel() {
        return '';
    }
    
    setLabel(label, options) {
        if (label == null) {
            this.unset(Attribute.Label, options);
        }
        else {
            this.set(Attribute.Label, label, options);
        }
    }
    
    getInspectorConfig() {
        return {
            ...super.getInspectorConfig(),
            groups: {
                general: {
                    label: 'General',
                    index: 1
                }
            },
            inputs: {
                [Attribute.Label]: {
                    type: 'text',
                    label: 'Name',
                    group: 'general',
                    attrs: {
                        input: {
                            placeholder: this.getDefaultLabel(),
                        }
                    }
                }
            }
        };
    }
}
