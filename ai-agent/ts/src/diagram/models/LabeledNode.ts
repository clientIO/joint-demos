import Node from './Node';
import { Attribute } from '../const';

import type { dia } from '@joint/plus';
import type { NodeAttributes } from './Node';
import type { InspectorConfig } from '../../types';

export interface LabeledNodeAttributes extends NodeAttributes {
    [Attribute.Label]?: string;
}

/** An abstract node with a label. */
export default abstract class LabeledNode<A extends LabeledNodeAttributes = LabeledNodeAttributes> extends Node<A> {

    initialize(attributes: A, options: dia.Cell.Options): void {
        super.initialize(attributes, options);

        this.updateLabel();
        this.on(`change:${Attribute.Label}`, () => this.updateLabel());
    }

    updateLabel() {
        // If no label is set or the label is an empty string,
        // display the default label.
        this.attr(['label', 'text'], this.getLabel() || this.getDefaultLabel());
    }

    getLabel(): string | null {
        return this.get(Attribute.Label) ?? null;
    }

    getDefaultLabel() {
        return '';
    }

    setLabel(label: string | null, options?: dia.Cell.Options): void {
        if (label == null) {
            this.unset(Attribute.Label, options);
        } else {
            this.set(Attribute.Label, label, options);
        }
    }

    getInspectorConfig(): InspectorConfig {
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
