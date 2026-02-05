import { dia } from '@joint/plus';

/**
 * Animated view base class for all application shapes that should animate when positioned
 */
export default class AnimatedElementView extends dia.ElementView {
    onMount(isInitialMount) {
        super.onMount(isInitialMount);
        // Ensure the transformation is set on initial mount
        // to avoid the views always appearing at x: 0, y: 0
        if (isInitialMount)
            this.updateTransformation();
    }
}
