import type { dia } from '@joint/plus';
import { util } from '@joint/plus';
import { SystemButton } from '../../system/diagram/models';
import Theme, { buttonBodyAttributes, buttonIconAttributes } from '../theme';

/** SVG markup for the button */
const buttonMarkup = util.svg/* xml */`
    <circle @selector="body" class="add-button-body"/>
    <path @selector="icon" class="add-button-icon"/>
`;

export interface ButtonAttributes extends dia.Element.Attributes {
    // No additional attributes for now
}

export default class Button extends SystemButton<ButtonAttributes> {

    preinitialize(): void {
        this.markup = buttonMarkup;
    }

    defaults(): Partial<ButtonAttributes> {
        const attributes: Partial<ButtonAttributes> = {
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
