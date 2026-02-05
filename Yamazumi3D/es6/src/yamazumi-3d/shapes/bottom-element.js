import { util } from '@joint/plus';
import { RectPrism, RectPrismView } from './rect-prism';

const TYPE = 'yamazumi.BottomElement';

export class BottomElement extends RectPrism {
    constructor(attributes, options) {
        attributes.label = '';
        super(attributes, options);
        const { operators, operationGap, taskWidth, depth } = attributes;
        
        const width = (operators.length * taskWidth) + operationGap;
        
        this.prop({
            size: {
                width: width,
                height: 30
            },
            attrs: {
                side: {
                    d: `M calc(w) 0 l ${depth + RectPrism.bottomMargin} -${depth + RectPrism.bottomMargin} v calc(h-${RectPrism.bottomMargin}) l -${depth + RectPrism.bottomMargin} ${depth + RectPrism.bottomMargin} z`
                },
                top: {
                    d: `M 0 0 l ${depth + RectPrism.bottomMargin} -${depth + RectPrism.bottomMargin} h calc(w) l -${depth + RectPrism.bottomMargin} ${depth + RectPrism.bottomMargin} z`
                }
            }
        });
        
        operators.forEach((operator, i) => {
            const x = i * taskWidth + i * operationGap + taskWidth / 2;
            
            this.markup.push(...util.svg /* xml */ `
                <text
                    @selector="label${i + 1}"
                    text-anchor="middle"
                    x="${x}"
                    y="18"
                    font-family="Noto Sans"
                    stroke="none"
                    fill="#4B5563"
                    font-size="12"
                    font-weight="600"
                >
                    ${operator.label}
                </text>
            `);
        });
    }
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults()), { type: TYPE, z: -1 });
    }
}

export class BottomElementView extends RectPrismView {
}
