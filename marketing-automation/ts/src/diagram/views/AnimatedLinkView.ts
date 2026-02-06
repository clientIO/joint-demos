import { dia } from '@joint/plus';

/**
 * Animated view base class for all application links that should animate their labels
 * when changing its shape.
 */
export default class AnimatedLinkView extends dia.LinkView {

    transitionAllowed = false;

    protected updatePath(): void {
        super.updatePath();
        if (!this.transitionAllowed && this.isLabelTransitionAllowed()) {
            // On the initial DOM update, disable transitions to avoid animating from (0,0)
            this.preventLabelTransition();
        } else {
            // On subsequent updates, re-enable transitions
            this.allowLabelTransition();
            this.transitionAllowed = true;
        }
    }

    protected onLabelsChange(link: dia.Link, labels: dia.Link.Label[], opt: { [key: string]: any; }): void {
        super.onLabelsChange(link, labels, opt);
        // A label has been edited, prevent transition for the next update
        this.preventLabelTransition();
    }

    protected getLabelNode(): SVGGElement {
        return this.findLabelNode(0, 'root') as SVGGElement;
    }

    protected preventLabelTransition() {
        this.getLabelNode()?.classList.add('no-transition');
    }

    protected allowLabelTransition() {
        this.getLabelNode()?.classList.remove('no-transition');
    }

    protected isLabelTransitionAllowed(): boolean {
        return !this.getLabelNode()?.classList.contains('no-transition');
    }

}
