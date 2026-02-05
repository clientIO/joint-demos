import { util } from '@joint/plus';
import { SystemPlaceholder } from '../../system/diagram/models';
import Theme, { buttonBodyAttributes, buttonIconAttributes } from '../theme';

/** SVG markup for the placeholder */
const placeholderMarkup = util.svg /* xml*/ `
    <rect @selector="body" class="node-body placeholder-body"/>
    <circle @selector="buttonBody" class="add-button-body"/>
    <path @selector="buttonIcon" class="add-button-icon"/>
`;

export default class Placeholder extends SystemPlaceholder {
    
    preinitialize() {
        this.markup = placeholderMarkup;
    }
    
    defaults() {
        const attributes = {
            size: {
                width: Theme.NodeWidth,
                height: Theme.NodeHeight,
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: 'transparent',
                    stroke: Theme.PlaceholderBorderColor,
                    strokeWidth: Theme.PlaceholderBorderWidth,
                    strokeDasharray: Theme.PlaceholderBorderPattern,
                    rx: Theme.NodeBorderRadius,
                    ry: Theme.NodeBorderRadius,
                },
                buttonBody: {
                    ...buttonBodyAttributes,
                    cx: 'calc(w / 2)',
                    cy: 'calc(h / 2)',
                },
                buttonIcon: {
                    ...buttonIconAttributes,
                    transform: `translate(calc(w/2), calc(h/2))`,
                }
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults);
    }
}
