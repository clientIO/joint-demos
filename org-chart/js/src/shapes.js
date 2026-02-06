import { dia } from '@joint/plus';

const memberButtonBody = {
    width: 20,
    height: 20,
    rx: 20,
    ry: 20,
    x: -10,
    y: -10,
};

export const Member = dia.Element.define('Member', {
    size: { width: 333, height: 98 },
    attrs: {
        root: {
            cursor: 'move'
        },
        body: {
            width: 'calc(w)',
            height: 'calc(h)',
            fill: '#FFFFFF',
            stroke: '#e4e4e4',
            rx: 40,
            ry: 40,
        },
        label: {
            x: 86,
            y: 31,
            fontFamily: 'Montserrat',
            fontWeight: 700,
            fontSize: 16,
            lineHeight: 19,
            fill: '#241332',
            text: 'Label',
            textWrap: {
                width: -120,
                maxLineCount: 1,
                ellipsis: true
            },
            textVerticalAnchor: 'top',
        },
        description: {
            x: 86,
            y: 51,
            fontFamily: 'Montserrat',
            fontWeight: 400,
            fontSize: 12,
            lineHeight: 15,
            opacity: 0.56,
            fill: '#352641',
            textVerticalAnchor: 'top',
            text: 'Description',
            textWrap: {
                width: -95,
                maxLineCount: 1,
                ellipsis: true
            }
        },
        icon: {
            width: 36,
            height: 36,
            x: 30,
            y: 30
        },
        memberAddButton: {
            class: 'member-button',
            cursor: 'pointer',
            fill: '#4666E5',
            event: 'element:member:add',
            transform: 'translate(calc(0.5 * w - 20), calc(h))',
            z: 3
        },
        memberAddButtonBody: memberButtonBody,
        memberAddButtonIcon: {
            d: 'M -4 0 4 0 M 0 -4 0 4',
            stroke: '#FFFFFF',
            strokeWidth: 2
        },
        memberRemoveButton: {
            class: 'member-button',
            height: 10,
            width: 10,
            cursor: 'pointer',
            fill: '#FF4365',
            event: 'element:remove',
            transform: 'translate(calc(0.5 * w + 20), calc(h))',
        },
        memberRemoveButtonBody: memberButtonBody,
        memberRemoveButtonIcon: {
            d: 'M -4 0 4 0',
            stroke: '#FFFFFF',
            strokeWidth: 2
        },
        memberEditIconContainer: {
            height: 14,
            width: 14,
            cursor: 'pointer',
            event: 'element:edit',
            fill: 'none',
            x: 293,
            y: 28,
        },
        memberEditIcon: {
            d: 'M -6 0 L 0 6 L 6 0',
            stroke: '#78849E',
            strokeWidth: 3,
            cursor: 'pointer',
            event: 'element:edit',
            transform: 'translate(300, 33)',
            fill: '#FFFFFF'
        },
    }
}, {
    
    markup: [{
            tagName: 'rect',
            selector: 'body',
        }, {
            tagName: 'text',
            selector: 'label',
        }, {
            tagName: 'text',
            selector: 'description',
        }, {
            tagName: 'image',
            selector: 'icon',
        }, {
            tagName: 'g',
            selector: 'memberAddButton',
            children: [{
                    tagName: 'rect',
                    selector: 'memberAddButtonBody'
                }, {
                    tagName: 'path',
                    selector: 'memberAddButtonIcon'
                }]
        }, {
            tagName: 'g',
            selector: 'memberRemoveButton',
            children: [{
                    tagName: 'rect',
                    selector: 'memberRemoveButtonBody'
                }, {
                    tagName: 'path',
                    selector: 'memberRemoveButtonIcon'
                }]
        }, {
            tagName: 'rect',
            selector: 'memberEditIconContainer'
        }, {
            tagName: 'path',
            selector: 'memberEditIcon'
        }]
});

export const Link = dia.Link.define('Link', {
    attrs: {
        root: {
            cursor: 'pointer'
        },
        line: {
            fill: 'none',
            connection: true,
            stroke: '#78849E',
            strokeWidth: 1
        }
    }
}, {
    markup: [{
            tagName: 'path',
            selector: 'line'
        }]
});
