import { dia, util } from '@joint/plus';

const TYPE = 'yamazumi.RectPrism';

export class RectPrism extends dia.Element {
    
    constructor(attributes, options) {
        attributes.labelColor = attributes.labelColor || '#000000';
        const { topColor, sideColor, frontColor, depth, label, labelColor } = attributes;
        super(util.defaultsDeep({
            attrs: {
                top: {
                    fill: topColor,
                    d: `M 0 0 l ${depth} -${depth} h calc(w) l -${depth} ${depth} z`
                },
                side: {
                    fill: sideColor,
                    d: `M calc(w) 0 l ${depth} -${depth} v calc(h-${RectPrism.bottomMargin}) l -${depth} ${depth} z`
                },
                front: {
                    fill: frontColor
                },
                label: {
                    text: label,
                    fill: labelColor
                }
            }
        }, attributes), options);
    }
    
    preinitialize() {
        this.markup = util.svg /* xml */ `
            <path @selector="top"/>
            <path @selector="side"/>
            <rect @selector="front"/>
            <text @selector="label"/>
        `;
    }
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: TYPE, size: {
                width: 180,
                height: 50
            }, attrs: {
                front: {
                    width: 'calc(w)',
                    height: `calc(h-${RectPrism.bottomMargin})`,
                    strokeWidth: 0
                },
                side: {
                    strokeWidth: 0,
                },
                top: {
                    strokeWidth: 0,
                },
                label: {
                    class: 'jj-yamazumi-prism-text',
                    textVerticalAnchor: 'top',
                    y: 10,
                    x: 10,
                    textWrap: {
                        width: 'calc(w-70)',
                        height: 'calc(h-10)',
                        ellipsis: true
                    }
                },
            } });
    }
}
RectPrism.bottomMargin = 2;

export class RectPrismView extends dia.ElementView {
}

