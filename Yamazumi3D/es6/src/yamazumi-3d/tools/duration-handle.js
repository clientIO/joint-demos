import { elementTools } from '@joint/plus';

export class DurationHandle extends elementTools.Control {
    
    constructor(options) {
        super(options);
        this.affectedElements = [];
    }
    
    preinitialize() {
        this.children = [{
                tagName: 'circle',
                selector: 'handle',
                attributes: {
                    class: 'jj-yamazumi-duration-handle',
                    r: 6,
                    fill: this.options.color
                }
            }];
    }
    
    getPosition(view) {
        const { model } = view;
        return { x: model.size().width / 2, y: 0 };
    }
    
    setPosition(view, coordinates) {
        const { model } = view;
        const duration = model.get('duration');
        const durationChange = -Math.round(coordinates.y / this.options.durationHeight);
        const stack = this.options.layout.model.getStackFromElement(view.model);
        const currentDuration = stack.elements.reduce((agg, el) => agg + el.get('duration'), 0) - duration;
        let newDuration = Math.max(duration + durationChange, this.options.minDuration);
        if (currentDuration + newDuration > this.options.maxDuration) {
            newDuration = this.options.maxDuration - currentDuration;
        }
        model.set('duration', newDuration);
    }
    
    onPointerDown(evt) {
        super.onPointerDown(evt);
        this.relatedView.model.graph.set('animationDisabled', true);
    }
    
    onPointerUp(evt) {
        super.onPointerUp(evt);
        this.relatedView.model.graph.set('animationDisabled', false);
    }
}
