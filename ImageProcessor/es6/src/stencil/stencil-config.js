import { dia } from '@joint/plus';
import { createNodeByType } from '../nodes/node-helper';

class StencilElement extends dia.Element {
    constructor() {
        super(...arguments);
        
        this.markup = [{
                tagName: 'image',
                selector: 'icon',
            }, {
                tagName: 'text',
                selector: 'label',
                className: 'stencil-label'
            }];
    }
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'StencilElement', size: { width: 150, height: 20 }, attrs: {
                icon: {
                    x: 0,
                    y: 0,
                    width: 24,
                    height: 24,
                    cursor: 'pointer'
                },
                label: {
                    x: 12,
                    y: 35,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fill: '#cad8e3',
                    fontSize: 12,
                    cursor: 'pointer',
                },
            } });
    }
}

function createStencilElement(type) {
    const node = createNodeByType(type);
    
    const icon = `assets/stencil/icons/${type}.png`;
    
    const element = new StencilElement({
        node: node,
        attrs: {
            icon: {
                href: icon,
            },
            label: {
                fill: 'black',
                text: node.get('name')
            }
        }
    });
    
    return element;
}

export function getStencilGroups() {
    return {
        basic: { index: 1, label: 'Basic' },
        filters: { index: 2, label: 'Filters' },
        transform: { index: 3, label: 'Transform' },
        inputs: { index: 4, label: 'Inputs' },
        math: { index: 5, label: 'Math' },
    };
}

export function getStencilConfig() {
    return {
        basic: [
            createStencilElement('processor.Display'),
            createStencilElement('processor.Upload'),
            createStencilElement('processor.Properties'),
        ],
        filters: [
            createStencilElement('processor.Grayscale'),
            createStencilElement('processor.Blur'),
            createStencilElement('processor.Invert'),
            createStencilElement('processor.Sepia'),
            createStencilElement('processor.Tint'),
        ],
        transform: [
            createStencilElement('processor.Mirror'),
            createStencilElement('processor.Blend'),
            createStencilElement('processor.Clip'),
            createStencilElement('processor.Resize'),
            createStencilElement('processor.Crop'),
            createStencilElement('processor.Overlay'),
            createStencilElement('processor.Threshold'),
            createStencilElement('processor.FillContours')
        ],
        inputs: [
            createStencilElement('processor.TextInput'),
            createStencilElement('processor.NumberInput'),
            createStencilElement('processor.BooleanInput'),
            createStencilElement('processor.ColorInput'),
        ],
        math: [
            createStencilElement('processor.Addition'),
            createStencilElement('processor.Division'),
            createStencilElement('processor.Multiplication'),
            createStencilElement('processor.Subtraction'),
        ]
    };
}
