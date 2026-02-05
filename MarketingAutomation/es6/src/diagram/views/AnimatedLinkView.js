import { dia } from '@joint/plus';

/**
 * Animated view base class for all application links that should animate their labels
 * when changing its shape.
 */
export default class AnimatedLinkView extends dia.LinkView {
    constructor() {
        super(...arguments);
        
        this.transitionAllowed = false;
        
    }
    
    updatePath() {
        super.updatePath();
        if (!this.transitionAllowed && this.isLabelTransitionAllowed()) {
            // On the initial DOM update, disable transitions to avoid animating from (0,0)
            this.preventLabelTransition();
        }
        else {
            // On subsequent updates, re-enable transitions
            this.allowLabelTransition();
            this.transitionAllowed = true;
        }
    }
    
    onLabelsChange(link, labels, opt) {
        super.onLabelsChange(link, labels, opt);
        // A label has been edited, prevent transition for the next update
        this.preventLabelTransition();
    }
    
    getLabelNode() {
        return this.findLabelNode(0, 'root');
    }
    
    preventLabelTransition() {
        var _a;
        (_a = this.getLabelNode()) === null || _a === void 0 ? void 0 : _a.classList.add('no-transition');
    }
    
    allowLabelTransition() {
        var _a;
        (_a = this.getLabelNode()) === null || _a === void 0 ? void 0 : _a.classList.remove('no-transition');
    }
    
    isLabelTransitionAllowed() {
        var _a;
        return !((_a = this.getLabelNode()) === null || _a === void 0 ? void 0 : _a.classList.contains('no-transition'));
    }
}
