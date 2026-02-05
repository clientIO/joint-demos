import { linkTools } from '@joint/plus';

export const SourceArrowhead = linkTools.SourceArrowhead.extend({
    tagName: 'circle',
    attributes: {
        'cx': 3,
        'r': 10,
        'fill': 'transparent',
        'stroke': '#5755a1',
        'stroke-width': 2,
        'cursor': 'move',
        'class': 'target-arrowhead',
        'fill-opacity': 0.2
    }
});

export const TargetArrowhead = linkTools.TargetArrowhead.extend({
    tagName: 'circle',
    attributes: {
        'cx': -7,
        'r': 10,
        'fill': 'transparent',
        'stroke': '#5755a1',
        'stroke-width': 2,
        'cursor': 'move',
        'class': 'target-arrowhead',
        'fill-opacity': 0.2
    }
});

export const Button = linkTools.Button.extend({
    children: [{
        tagName: 'circle',
        selector: 'button',
        attributes: {
            'r': 10,
            'fill': '#f6f6f6',
            'stroke': '#5755a1',
            'stroke-width': 2,
            'cursor': 'pointer'
        }
    }, {
        tagName: 'path',
        selector: 'icon',
        attributes: {
            'd': 'M -4 -4 4 4 M -4 4 4 -4',
            'fill': 'none',
            'stroke': '#5755a1',
            'stroke-width': 4,
            'pointer-events': 'none'
        }
    }]
});
