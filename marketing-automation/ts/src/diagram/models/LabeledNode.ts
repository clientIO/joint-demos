import Node from './Node';
import { Attribute } from '../const';

import type { dia } from '@joint/plus';
import type { NodeAttributes } from './Node';
import type { InspectorConfig } from '../../types';

export interface LabeledNodeAttributes extends NodeAttributes {
    [Attribute.Label]?: string;
}

export default abstract class LabeledNode<A extends LabeledNodeAttributes = LabeledNodeAttributes> extends Node<A> {

    initialize(attributes: A, options: dia.Cell.Options): void {
        super.initialize(attributes, options);

        this.updateLabel();
        this.on(`change:${Attribute.Label}`, () => this.updateLabel());
    }

    /**
     * Updates the label of the node based on the label attribute, otherwise the default label is displayed.
     * @see {@link Attribute.Label}
     * @see {@link getDefaultLabel}
     */
    updateLabel() {
        // If no label is set or the label is an empty string,
        // display the default label.
        this.attr(['label', 'text'], this.getLabel() || this.getDefaultLabel());
    }

    /**
     * @returns The label of the node from the node model.
     * @see {@link Attribute.Label}
     */
    getLabel(): string | null {
        return this.get(Attribute.Label) ?? null;
    }

    /**
     * @returns The default label for the node.
     */
    getDefaultLabel() {
        return '';
    }

    /**
     * Sets the label for the node.
     * @param label - The label to set.
     * @param options - The options to pass to the set and unset methods.
     * @see {@link Attribute.Label}
     */
    setLabel(label: string | null, options?: dia.Cell.Options): void {
        if (label == null) {
            this.unset(Attribute.Label, options);
        } else {
            this.set(Attribute.Label, label, options);
        }
    }

    /**
     * @returns Inspector config for the node.
     * @see {@link InspectorConfig}
     */
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
