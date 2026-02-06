import type { dia } from '@joint/plus';
import { elementTools, util } from '@joint/plus';

import type Note from '../models/Note';


const resizeToolMarkup = util.svg/* xml */`
    <g @selector="handle">
        <rect class="tool-button" width="24" height="24" fill="none" stroke="none"/>
        <use class="tool-button-icon" transform="translate(24,0) scale(-1,1)" width="24" height="24" href="assets/icons/resize.svg#icon"/>
    </g>
`;

export interface ResizeToolOptions extends elementTools.Control.Options {
    onResizeEnd?: (size: dia.Size) => void;
}

export default class ResizeTool extends elementTools.Control<ResizeToolOptions> {

    preinitialize() {
        this.attributes = {
            cursor: 'nwse-resize'
        };
        this.children = resizeToolMarkup;
    }

    initialize() {
        super.initialize();
        this.el.classList.add('fade-in');
    }

    getPosition(view: dia.ElementView) {
        const model = view.model;
        const { width, height } = model.size();
        return { x: width - 25, y: height - 25 };
    }

    setPosition(view: dia.ElementView, coordinates: dia.Point) {
        const model = view.model;
        model.resize(
            Math.max(coordinates.x + 12, 1),
            Math.max(coordinates.y + 12, 1)
        );
    }

    protected onPointerUp(evt: dia.Event) {
        super.onPointerUp(evt);
        const note = this.relatedView.model as Note;
        this.options.onResizeEnd?.(note.size());
    }
}
