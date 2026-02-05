import type { dia, ui } from '@joint/plus';
import { elementTools } from '@joint/plus';

export interface DurationHandleOptions extends elementTools.Control.Options{
    durationHeight: number,
    maxDuration: number,
    minDuration: number,
    layout: ui.StackLayoutView,
    color: string
}

export class DurationHandle extends elementTools.Control<DurationHandleOptions> {
    affectedElements: Array<dia.Element> = [];

    constructor(options: DurationHandleOptions) {
        super(options);
    }

    preinitialize(): void {
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

    protected getPosition(view: dia.ElementView): dia.Point {
        const { model } = view;
        return { x: model.size().width / 2, y: 0 };
    }

    protected setPosition(view: dia.ElementView, coordinates: dia.Point): void {
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

    protected onPointerDown(evt: dia.Event) {
        super.onPointerDown(evt);
        this.relatedView.model.graph.set('animationDisabled', true);
    }

    protected onPointerUp(evt: dia.Event) {
        super.onPointerUp(evt);
        this.relatedView.model.graph.set('animationDisabled', false);
    }
}
