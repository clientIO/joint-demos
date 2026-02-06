import { elementTools, util } from '@joint/plus';


const resizeToolMarkup = util.svg /* xml */ `
    <g @selector="handle">
        <rect class="tool-button" width="24" height="24" fill="none" stroke="none"/>
        <use class="tool-button-icon" transform="translate(24,0) scale(-1,1)" width="24" height="24" href="assets/icons/resize.svg#icon"/>
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
        return { x: width - 25, y: height - 25 };
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
