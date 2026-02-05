import { dia } from '@joint/plus';

export class AnimatedElementView extends dia.ElementView {
    
    updateTransformation() {
        const { el, model } = this;
        const { x, y } = model.get('position');
        const transform = `translate(${x}px, ${y}px)`;
        const keyframes = { transform: [transform] };
        let move;
        if (this.move) {
            move = this.move;
            move.effect.setKeyframes(keyframes);
            move.currentTime = 0;
            move.play();
        }
        else {
            move = el.animate(keyframes, {
                easing: 'ease-in',
                fill: 'forwards',
                duration: 200
            });
            move.onfinish = () => el.parentNode && move.commitStyles();
            move.finish();
            this.move = move;
        }
    }
}
