import { util } from '@joint/plus';
import { SystemButtonLine } from '../../system/diagram/models';
import Theme from '../theme';

import type { SystemEdgeAttributes } from '../../system/diagram/models';

const buttonLineMarkup = util.svg/* xml */`
    <path @selector="line"
        stroke-linejoin="round"
        fill="none"
        pointer-events="none"
    />
`;

export interface ButtonLineAttributes extends SystemEdgeAttributes {
    // No additional attributes for ButtonLine at the moment
}

export default class ButtonLine extends SystemButtonLine<ButtonLineAttributes> {

    preinitialize(): void {
        this.markup = buttonLineMarkup;
    }

    defaults(): Partial<ButtonLineAttributes> {
        const attributes: Partial<ButtonLineAttributes> = {
            // JointJS attributes
            attrs: {
                line: {
                    connection: true,
                    stroke: Theme.ButtonLineColor,
                    strokeWidth: Theme.ButtonLineWidth,
                    strokeDasharray: Theme.ButtonLinePattern,
                }
            },
        };

        return util.defaultsDeep(attributes, super.defaults());
    }

}
