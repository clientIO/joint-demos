import type { dia } from '@joint/plus';
import { util } from '@joint/plus';
import type { RectPrismAttributes } from './rect-prism';
import { RectPrism, RectPrismView } from './rect-prism';

const TYPE = 'yamazumi.TaskElement';

interface TaskElementsAttributes extends RectPrismAttributes {
    duration: number,
    durationHeight: number
}

export class TaskElement extends RectPrism<TaskElementsAttributes> {
    constructor(attributes: TaskElementsAttributes, options?: dia.Graph.Options) {
        super(attributes, options);

        this.setTaskHeight();

        this.on('change:duration', () => {
            this.setTaskHeight();
        });
    }

    defaults(): any {
        return util.defaultsDeep({
            type: TYPE,
            attrs: {
                root: {
                    cursor: 'move'
                }
            }
        }, super.defaults());
    }

    setTaskHeight() {
        const height = this.get('duration') * this.get('durationHeight');

        this.prop('size/height', height);
    }
}

export class TaskElementView extends RectPrismView {
    private readonly animation: KeyframeAnimationOptions | null = {
        easing: 'ease-in',
        fill: 'forwards',
        duration: 200
    };

    move: Animation;

    updateTransformation() {

        const { el, model } = this;
        const { x, y } = model.get('position');
        const transform = `translate(${x}px, ${y}px)`;
        const keyframes = { transform: [transform] };
        let move: Animation;
        if (this.move) {
            move = this.move;
            (<KeyframeEffect>move.effect).setKeyframes(keyframes);
            move.currentTime = 0;
        } else {
            move = el.animate(keyframes, this.animation);
            move.onfinish = () => move.commitStyles();
            this.move = move;
        }
        if (model.get('animation')) {
            move.play();
        } else {
            move.finish();
        }
    }
}
