import { dia } from '@joint/plus';
import { EventShapeTypes } from '../shapes/event/event-config';
import { GatewayShapeTypes } from '../shapes/gateway/gateway-config';
import { ActivityShapeTypes } from '../shapes/activity/activity-config';
import { DataShapeTypes } from '../shapes/data/data-config';
import { GroupShapeTypes } from '../shapes/group/group-config';
import { PoolShapeTypes } from '../shapes/pool/pool-config';

interface StencilShapeConfig {
    icon: string;
}

export enum StencilShapeTypes {
    STENCIL_SHAPE = 'stencil.Shape'
}

const SHAPE_SIZE = 32;

// Note: StencilShape can not be deserialized since it is not defined in `joint.shapes` namespace.

class StencilShape extends dia.Element {

    defaults(): dia.Element.Attributes {
        return {
            ...super.defaults,
            type: StencilShapeTypes.STENCIL_SHAPE,
            size: { width: SHAPE_SIZE, height: SHAPE_SIZE },
            attrs: {
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
            }
        };
    }

    markup = [{
        tagName: 'text',
        selector: 'icon'
    }];

    static create(type: string): StencilShape {
        const config = stencilShapesConfig[type];
        if (!config) throw new Error(`No stencil shape for type: "${type}" is defined.`);
        const { icon } = config;
        return new this({
            dropType: type,
            attrs: {
                icon: {
                    text: icon
                }
            }
        });
    }
}


const stencilShapesConfig: Record<string, StencilShapeConfig> = {
    [EventShapeTypes.START]: {
        icon: '\ue036'
    },
    [EventShapeTypes.INTERMEDIATE_THROWING]: {
        icon: '\ue013'
    },
    [EventShapeTypes.END]: {
        icon: '\ue046'
    },
    [GatewayShapeTypes.EXCLUSIVE]: {
        icon: '\ue028'
    },
    [ActivityShapeTypes.TASK]: {
        icon: '\ue077'
    },
    [DataShapeTypes.DATA_STORE]: {
        icon: '\ue084'
    },
    [DataShapeTypes.DATA_OBJECT]: {
        icon: '\ue086'
    },
    [GroupShapeTypes.GROUP]: {
        icon: '\ue085'
    },
    [PoolShapeTypes.HORIZONTAL_POOL]: {
        icon: '\ue124',
    },
    [PoolShapeTypes.VERTICAL_POOL]: {
        icon: '\ue126',
    },
    [PoolShapeTypes.HORIZONTAL_SWIMLANE]: {
        icon: '\ue123',
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
    highlight(cellView: dia.CellView, _node: Node) {
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
