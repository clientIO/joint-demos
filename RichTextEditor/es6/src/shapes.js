import { dia } from '@joint/plus';
import { DEFAULT_TEXT_ATTRIBUTES } from './config';

const PADDING = 25;
const CORNER = 20;

export const RESIZE_FLAG = 'autoResized';

export class TextNode extends dia.Element {
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'TextNode', attrs: {
                root: {
                    cursor: 'move'
                },
                body: {
                    fill: '#FFF',
                    height: 'calc(h)',
                    width: 'calc(w)',
                    stroke: '#DDDDDD',
                    strokeWidth: 0.5,
                    strokeLinejoin: 'round',
                    d: `
                        M ${CORNER} 0 0 ${CORNER} 0 calc(h) L calc(w) calc(h) L calc(w) 0 Z
                        M 0 ${CORNER} ${CORNER} ${CORNER} ${CORNER} 0 Z
                    `
                },
                label: Object.assign(Object.assign({}, DEFAULT_TEXT_ATTRIBUTES), { x: PADDING, y: PADDING, cursor: 'text', textVerticalAnchor: 'top', textAnchor: 'start', lineHeight: 'auto', displayEmpty: true })
            }, z: 2 });
    }
    
    preinitialize() {
        this.markup = [{
                tagName: 'path',
                selector: 'body'
            }, {
                tagName: 'text',
                selector: 'label'
            }];
    }
    
    adjustSize(paper) {
        const view = paper.findViewByModel(this);
        const labelNode = view.findNode('label');
        // Use bounding box without transformations so that our auto-sizing works
        // even on e.g. rotated element.
        const { width, height } = view.getNodeBoundingRect(labelNode).inflate(PADDING);
        this.resize(width, height, { [RESIZE_FLAG]: true, direction: 'bottom-right' });
    }
    
    static setupAutoSizeAdjustment(paper) {
        const { model } = paper;
        model.getElements().forEach((el) => el.adjustSize(paper));
        model.on('change', (cell, opt) => {
            if (!(cell instanceof this))
                return;
            if (cell.hasChanged('attrs') && !opt[RESIZE_FLAG]) {
                cell.adjustSize(paper);
            }
        });
    }
    
    static create(x, y, text, annotations, bodyAttrs) {
        return new TextNode({
            position: { x, y },
            attrs: {
                label: {
                    text,
                    annotations
                },
                body: bodyAttrs
            }
        });
    }
}

TextNode.ANNOTATION_PATH = ['attrs', 'label', 'annotations'];

TextNode.LABEL_PATH = ['attrs', 'label', 'text'];

export const textNodes = [
    TextNode.create(450, 50, [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Fusce maximus dui ac neque fringilla tincidunt.',
        'Pellentesque habitant morbi tristique senectus',
        'et netus et malesuada fames ac turpis egestas.',
        'Orci varius natoque penatibus et magnis dis parturient montes,',
        'nascetur ridiculus mus.'
    ].join('\n'), [], { fill: '#fee68f', stroke: '#b18b01' }),
    
    TextNode.create(50, 50, [
        'A full-featured text editor',
        '',
        '- rich-text editing',
        '- caret & selections',
        '- caret & selection CSS styling',
        '- word & whole-text selection by double/triple-click',
        '- KB navigation native to the underlying OS',
        '- API for programmatic access',
        '- supports editing of scaled & rotated text',
        ''
    ].join('\n'), [
        {
            start: -1,
            end: 27,
            attrs: {
                'font-size': 24,
                'font-family': 'Pacifico,cursive',
                fill: '#31D0C6',
                'font-weight': 'normal',
                'text-decoration': 'underline',
            },
        },
        {
            start: 31,
            end: 48,
            attrs: {
                'font-size': 24,
                fill: '#FE854F',
                'font-style': 'italic',
            },
        },
        {
            start: 51,
            end: 56,
            attrs: {
                'font-size': 16,
                fill: '#FEB663',
                'text-decoration': 'underline',
            },
        },
        {
            start: 59,
            end: 69,
            attrs: {
                'font-size': 16,
                fill: '#FEB663',
                'text-decoration': 'underline',
            },
        },
        {
            start: 90,
            end: 101,
            attrs: {
                'font-size': 18,
                'font-family': 'Lobster,cursive',
                fill: '#FEB663',
                'text-decoration': 'underline',
            },
        },
        {
            start: 104,
            end: 108,
            attrs: {
                'font-size': 18,
                'font-family': 'Helvetica',
                fill: '#FEB663',
                'text-decoration': 'underline',
            },
        },
        {
            start: 122,
            end: 131,
            attrs: {
                'font-size': 18,
                'font-family': 'Helvetica',
                fill: '#FEB663',
                'text-decoration': 'underline',
            },
        },
        {
            start: 157,
            end: 170,
            attrs: {
                'font-size': 16,
                'font-family': 'Josefin Sans,sans-serif',
                fill: '#FEB663',
                'text-decoration': 'underline',
            },
        },
        {
            start: 201,
            end: 204,
            attrs: {
                'font-size': 16,
                'font-family': 'Josefin Sans,sans-serif',
                fill: '#FE854F',
                'font-weight': 'bold',
            },
        },
        {
            start: 251,
            end: 267,
            attrs: {
                'font-size': 16,
                'font-family': 'Josefin Sans,sans-serif',
                fill: '#7C68FC',
                'font-weight': 'bold',
            },
        },
    ]),
    
    TextNode.create(550, 380, 'Rotated text\n\nEdit me...', [
        {
            start: -1,
            end: 27,
            attrs: {
                'font-size': 24,
                'font-family': 'Lobster,cursive',
                'fill': '#33334E',
                'font-style': 'normal',
                'font-weight': 'normal',
                'text-decoration': 'none',
            },
        },
    ], {
        fill: '#feb28f',
        stroke: '#fe854d'
    }).rotate(-45),
];
