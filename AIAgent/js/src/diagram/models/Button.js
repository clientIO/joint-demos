import { util } from '@joint/plus';
import { SystemButton } from '../../system/diagram/models';
import Theme, { buttonBodyAttributes, buttonIconAttributes } from '../theme';

/** SVG markup for the button */
const buttonMarkup = util.svg /* xml */ `
    <circle @selector="body" class="add-button-body"/>
    <path @selector="icon" class="add-button-icon"/>
`;

export default class Button extends SystemButton {
    
    preinitialize() {
        this.markup = buttonMarkup;
    }
    
    defaults() {
        const attributes = {
            size: {
                width: Theme.ButtonSize,
                height: Theme.ButtonSize,
            },
            attrs: {
                root: {
                    style: { cursor: 'pointer' }
                },
                body: {
                    ...buttonBodyAttributes,
                    magnet: true,
                    cx: 'calc(s/2)',
                    cy: 'calc(s/2)',
                },
                icon: {
                    ...buttonIconAttributes,
                    transform: `translate(calc(s/2), calc(s/2))`,
                }
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults());
    }
}
