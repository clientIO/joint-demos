import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme from '../theme';
import { SystemEdge } from '../../system/diagram/models';

/** SVG markup for the edge */
const edgeMarkup = util.svg /* xml */ `
    <path @selector="wrapper"
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke="transparent"
        fill="none"
        cursor="pointer"
    />
    <path @selector="line"
        stroke-linejoin="round"
        fill="none"
        pointer-events="none"
    />
`;

const ICON = 'assets/icons/condition.svg';

export default class Edge extends SystemEdge {
    
    // The type remains the same (explicitly set it here for clarity).
    // We overriding the default engine Edge with our own Edge class.
    static type = SystemEdge.type;
    
    preinitialize() {
        this.markup = edgeMarkup;
    }
    
    defaults() {
        const attributes = {
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            attrs: {
                line: {
                    connection: true,
                    stroke: Theme.EdgeColor,
                    strokeWidth: Theme.EdgeWidth,
                },
                wrapper: {
                    connection: true,
                    // An extra buffer around the edge for easier interaction
                    strokeWidth: Theme.EdgeWidth + 8,
                }
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults());
    }
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
    }
    
    getInspectorConfig() {
        const config = {
            headerText: 'Link',
            headerIcon: ICON,
            groups: {},
            inputs: {}
        };
        return config;
    }
}
