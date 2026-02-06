import { dia, shapes } from '@joint/plus';

export const PhasePreview = dia.HighlighterView.extend({
    
    tagName: 'path',
    
    attributes: {
        'fill': '#0075f2',
        'fill-opacity': 0.1,
        'stroke': '#0075f2',
        'stroke-width': 2,
        'stroke-dasharray': '5 5'
    },
    
    highlight(elementView, _node) {
        const { x = 0, y = 0 } = this.options;
        const phase = elementView.model;
        if (!shapes.bpmn2.Phase.isPhase(phase)) {
            throw new Error('PhasePreview can be added only to a Phase.');
        }
        
        const pool = phase.getParentCell();
        const phaseBBox = phase.getBBox();
        const horizontal = pool.isHorizontal();
        if (horizontal) {
            const dx = x - phaseBBox.x;
            this.vel.attr({
                d: `M ${dx} 0 V ${phaseBBox.height} h ${phaseBBox.width - dx} V 0 Z`,
            });
        }
        else {
            const dy = y - phaseBBox.y;
            this.vel.attr({
                d: `M 0 ${dy} H ${phaseBBox.width} v ${phaseBBox.height - dy} H 0 Z`,
            });
        }
    }
});
