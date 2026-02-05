import { dia } from '@joint/plus';
import Theme from '../theme';

/**
 * Pulse highlighter view that creates a pulsing border effect
 * around the highlighted element.
 */
export default class PulseEffect extends dia.HighlighterView {
    
    pathAnimation = null;
    
    preinitialize() {
        this.tagName = 'path';
        this.attributes = {
            'pointer-events': 'none'
        };
    }
    
    /**
     * Sets the attributes of the path element for the pulse effect.
     */
    prepareAnimationPath() {
        
        const node = this.cellView.model;
        const path = node.getOutlinePathData();
        const { strokeWidth = 1, } = this.options;
        
        this.vel.attr({
            d: path,
            fill: 'none',
            strokeWidth: strokeWidth,
            strokeDasharray: '1000',
            strokeDashoffset: '-1000',
            strokeLinejoin: 'round',
            strokeLinecap: 'round',
        });
    }
    
    highlight() {
        
        this.prepareAnimationPath();
        
        const { duration = 2, repeatCount = Infinity, pulseGradientStops = Theme.FlowPulseGradientStops, } = this.options;
        
        // Define a linear gradient for the pulsing effect
        // (if it already exists, its ID is reused)
        const gradientId = this.cellView.paper?.defineGradient({
            id: 'pulse-highlight-gradient',
            type: 'linearGradient',
            stops: pulseGradientStops,
            attrs: {
                x1: '0%',
                y1: '0%',
                x2: '100%',
                y2: '100%',
                gradientTransform: 'rotate(-67)'
            }
        });
        
        // Apply the gradient to the animated path
        const animatedPath = this.el;
        animatedPath.setAttribute('stroke', `url(#${gradientId})`);
        
        // Animate the stroke dashoffset to create a pulsing effect
        const timing = {
            duration: duration * 1000,
            iterations: repeatCount,
            easing: 'linear',
            fill: 'forwards'
        };
        const keyframes = [
            {
                offset: 0,
                opacity: 0,
                strokeDashoffset: '-1000',
            },
            {
                offset: 0.15,
                opacity: 1,
                strokeDashoffset: '-850',
            },
            {
                offset: 0.5,
                opacity: 1,
                strokeDashoffset: '-500',
            },
            {
                offset: 0.95,
                opacity: 1,
                strokeDashoffset: '0',
            },
            {
                offset: 1,
                opacity: 0,
                strokeDashoffset: '0',
            },
        ];
        
        this.pathAnimation = animatedPath.animate(keyframes, timing);
    }
}
