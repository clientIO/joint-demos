import type { ui } from '@joint/plus';
import { ICONS } from './icons';

export const inspectorOptions: Omit<ui.Inspector.Options, 'cell'> = {
    inputs: {
        attrs: {
            icon: {
                text: {
                    type: 'select-button-group',
                    group: 'icon',
                    label: 'Icon',
                    options: ICONS.map(({ name, char }) => ({
                        value: char,
                        content: `<span class="fa-option" title="${name}">${char}</span>`
                    })),
                    index: 1
                },
                fill: {
                    type: 'color',
                    group: 'icon',
                    label: 'Color',
                    index: 2
                }
            },
            label: {
                text: {
                    type: 'text',
                    group: 'label',
                    label: 'Text',
                    index: 1
                }
            }
        }
    },
    groups: {
        icon: { label: 'Icon', index: 1 },
        label: { label: 'Label', index: 2 }
    }
};
