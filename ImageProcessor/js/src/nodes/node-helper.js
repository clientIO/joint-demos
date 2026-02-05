import { Display } from './basic/display';
import { TextInput } from './inputs/text-input';
import { Grayscale } from './filters/grayscale';
import { Blur } from './filters/blur';
import { NumberInput } from './inputs/number-input';
import { Upload } from './basic/upload-image';
import { Invert } from './filters/invert';
import { Sepia } from './filters/sepia';
import { BooleanInput } from './inputs/boolean-input';
import { Mirror } from './transform/mirror';
import { Blend } from './transform/blend';
import { Clip } from './transform/clip';
import { Resize } from './transform/resize';
import { Crop } from './transform/crop';
import { ColorInput } from './inputs/color-input';
import { Tint } from './filters/tint';
import { Properties } from './basic/properties';
import { Overlay } from './transform/overlay';
import { Addition } from './math/addition';
import { Division } from './math/division';
import { Multiplication } from './math/multiplication';
import { Subtraction } from './math/subtraction';
import { Threshold } from './transform/threshold';
import { FillContours } from './transform/fill-contours';

export function createNodeByType(type) {
    switch (type) {
        case 'processor.Display':
            return new Display();
        case 'processor.TextInput':
            return new TextInput();
        case 'processor.Grayscale':
            return new Grayscale();
        case 'processor.Blur':
            return new Blur();
        case 'processor.NumberInput':
            return new NumberInput();
        case 'processor.Upload':
            return new Upload();
        case 'processor.Invert':
            return new Invert();
        case 'processor.Sepia':
            return new Sepia();
        case 'processor.BooleanInput':
            return new BooleanInput();
        case 'processor.Mirror':
            return new Mirror();
        case 'processor.Blend':
            return new Blend();
        case 'processor.Clip':
            return new Clip();
        case 'processor.Resize':
            return new Resize();
        case 'processor.Crop':
            return new Crop();
        case 'processor.ColorInput':
            return new ColorInput();
        case 'processor.Tint':
            return new Tint();
        case 'processor.Properties':
            return new Properties();
        case 'processor.Overlay':
            return new Overlay();
        case 'processor.Addition':
            return new Addition();
        case 'processor.Division':
            return new Division();
        case 'processor.Multiplication':
            return new Multiplication();
        case 'processor.Subtraction':
            return new Subtraction();
        case 'processor.Threshold':
            return new Threshold();
        case 'processor.FillContours':
            return new FillContours();
        default:
            throw new Error('Unknown node');
        
    }
}

export function createNodeShape(node) {
    const portsIn = node.get('inputSettings').map((input, i) => {
        return {
            group: 'in',
            attrs: {
                portBody: { portIndex: i },
                label: { text: input.name }
            }
        };
    });
    
    const portsOut = node.get('outputSettings').map((output, i) => {
        return {
            group: 'out',
            attrs: {
                portBody: { portIndex: i },
                label: { text: output.name }
            }
        };
    });
    
    node.addPorts([...portsIn, ...portsOut]);
    
    const attributes = {
        clipPath: {
            id: 'clip' + node.id
        },
        nodeHeader: {
            clipPath: `url(#clip${node.id})`,
            class: `node-header ${node.get('group')}`
        },
        nodeLabel: {
            text: node.get('name'),
            class: `node-label ${node.get('group')}`
        },
        help: {
            class: `node-help ${node.get('group')}`
        }
    };
    
    node.attr(attributes);
    
    return node;
}
