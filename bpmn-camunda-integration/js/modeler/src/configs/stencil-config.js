import { dia } from '@joint/plus';
import { EventShapeTypes } from '../shapes/event/event-config';
import { GatewayShapeTypes } from '../shapes/gateway/gateway-config';
import { ActivityShapeTypes } from '../shapes/activity/activity-config';

export var StencilShapeTypes;
(function (StencilShapeTypes) {
    StencilShapeTypes["STENCIL_SHAPE"] = "stencil.Shape";
})(StencilShapeTypes || (StencilShapeTypes = {}));

const SHAPE_SIZE = 32;

// Note: StencilShape can not be deserialized since it is not defined in `joint.shapes` namespace.

class StencilShape extends dia.Element {
    constructor() {
        super(...arguments);
        
        this.markup = [{
                tagName: 'text',
                selector: 'icon'
            }];
    }
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: StencilShapeTypes.STENCIL_SHAPE, size: { width: SHAPE_SIZE, height: SHAPE_SIZE }, attrs: {
                icon: {
                    pointerEvents: 'none',
                    fontSize: 'calc(h)',
                    x: 'calc(w / 2)',
                    y: 'calc(h / 2 + 1.5)',
                    fontFamily: 'JJ BPMN Icons',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fill: '#191919'
                }
            } });
    }
    
    static create(type) {
        const config = stencilShapesConfig[type];
        if (!config)
            throw new Error(`No stencil shape for type: "${type}" is defined.`);
        const { icon, tooltip } = config;
        return new this({
            dropType: type,
            tooltip,
            attrs: {
                icon: {
                    text: icon
                }
            }
        });
    }
}


const stencilShapesConfig = {
    [EventShapeTypes.START]: {
        icon: '\ue036',
        tooltip: 'Start Event: Begins a process flow'
    },
    [EventShapeTypes.END]: {
        icon: '\ue046',
        tooltip: 'End Event: Terminates a process flow'
    },
    [ActivityShapeTypes.SERVICE]: {
        icon: '\ue095',
        tooltip: 'Service Task: Executes an automated task'
    },
    [ActivityShapeTypes.HTTP_CONNECTOR]: {
        icon: '\ue075',
        tooltip: 'HTTP Request (REST Connector): Makes HTTP requests to external APIs'
    },
    [GatewayShapeTypes.EXCLUSIVE]: {
        icon: '\ue028',
        tooltip: 'Exclusive Gateway: Routes flow based on conditions'
    },
    [EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY]: {
        icon: '\ue008',
        tooltip: 'Timer Boundary Event: Triggers on a time condition'
    },
    [EventShapeTypes.ERROR_INTERMEDIATE_BOUNDARY]: {
        icon: '\ue056',
        tooltip: 'Error Boundary Event: Catches errors from an activity'
    }
};

export const stencilShapes = Object.keys(stencilShapesConfig).map((type) => StencilShape.create(type));

// Define a custom highlighter for the stencil hover effect
export const StencilHoverHighlighter = dia.HighlighterView.extend({
    tagName: 'rect',
    
    attributes: {
        'rx': 4,
        'ry': 4,
    },
    
    options: {
        padding: 0,
        width: null,
        height: null,
        className: '',
        z: 0 // Render the highlighter behind the element
    },
    
    // Method called to highlight a CellView
    highlight(cellView, _node) {
        const { padding, width, height, className } = this.options;
        const bbox = cellView.model.getBBox();
        // Highlighter is always rendered relatively to the CellView origin
        bbox.x = bbox.y = 0;
        // Custom width and height can be set
        if (Number.isFinite(width)) {
            bbox.x = (bbox.width - width) / 2;
            bbox.width = width;
        }
        if (Number.isFinite(height)) {
            bbox.y = (bbox.height - height) / 2;
            bbox.height = height;
        }
        // Increase the size of the highlighter
        bbox.inflate(padding);
        this.vel.attr(bbox.toJSON());
        
        this.vel.node.classList.add(className);
    },
});
