import { util } from '@joint/plus';
import { SystemButtonLine } from '../../system/diagram/models';
import Theme from '../theme';

const buttonLineMarkup = util.svg /* xml */ `
    <path @selector="line"
        stroke-linejoin="round"
        fill="none"
        pointer-events="none"
    />
`;

export default class ButtonLine extends SystemButtonLine {
    
    preinitialize() {
        this.markup = buttonLineMarkup;
    }
    
    defaults() {
        const attributes = {
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
