import { highlighters } from '@joint/plus';
import { Controller } from '../controller.js';

export const invalidPathHighlightId = 'invalid-path-member';
export const invalidPathClassName = 'invalid-path';

export class ViewController extends Controller {
    startListening() {
        const { paper } = this.context;

        this.listenTo(paper, {
            'element:pointerdown': selectSource,
            'element:mouseenter': selectEnd,
            'element:mouseleave': hidePathOnMouseLeave,
        });
    }
}

function selectSource({ setStartView }, elementView) {
    setStartView(elementView);
}

function selectEnd({ showPath, setEndView, getStartView, getEndView }, elementView) {
    const pathStartView = getStartView();
    const pathEndView = getEndView();

    if (elementView === pathStartView) return;
    if (pathStartView && pathEndView) {
        highlighters.addClass.remove(pathStartView, invalidPathHighlightId);
        highlighters.addClass.remove(pathEndView, invalidPathHighlightId);
    }
    setEndView(elementView);
    showPath();
}

function hidePathOnMouseLeave({ hidePath, getStartView, getEndView, setEndView }) {
    const pathStartView = getStartView();
    const pathEndView = getEndView();

    hidePath();
    if (pathStartView) highlighters.addClass.remove(pathStartView, invalidPathHighlightId);
    if (pathEndView) highlighters.addClass.remove(pathEndView, invalidPathHighlightId);
    setEndView(null);
}
