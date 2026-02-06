import { elementTools, util } from '@joint/plus';
import Theme from '../theme';

const resizeToolMarkup = util.svg /* xml */ `
    <g @selector="handle">
        <rect
            class="resize-button-background"
            width="${Theme.NodeToolSize}"
            height="${Theme.NodeToolSize}"
            fill="transparent"
            stroke="none"
            rx="8"
            ry="8"
        />
        <use
            class="resize-button-icon"
            x="${Theme.NodeToolPadding}"
            y="${Theme.NodeToolPadding}"
            width="${Theme.NodeToolSize - Theme.NodeToolPadding * 2}"
            height="${Theme.NodeToolSize - Theme.NodeToolPadding * 2}"
            transform="translate(${Theme.NodeToolSize},0) scale(-1,1)"
            href="assets/icons/resize.svg#icon"
        />
    </g>
`;

export default class ResizeTool extends elementTools.Control {
    
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
    
    getPosition(view) {
        const model = view.model;
        const { width, height } = model.size();
        return { x: width - 30, y: height - 30 };
    }
    
    setPosition(view, coordinates) {
        const model = view.model;
        model.resize(Math.max(coordinates.x + 12, 1), Math.max(coordinates.y + 12, 1));
    }
    
    onPointerUp(evt) {
        super.onPointerUp(evt);
        const note = this.relatedView.model;
        this.options.onResizeEnd?.(note.size());
    }
}
