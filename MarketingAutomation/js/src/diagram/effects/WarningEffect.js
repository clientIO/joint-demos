import { dia, util } from '@joint/plus';
import Theme from '../theme';

/**
 * Base class for warning effects displayed on nodes that are not properly configured.
 */
export default class WarningEffect extends dia.HighlighterView {
    tooltip = 'Warning: This node is not configured.';
    top = 0;
    
    preinitialize() {
        this.tagName = 'g';
        this.className = 'warning-effect';
    }
    
    highlight(view) {
        const node = view.model;
        const bbox = node.getBBox();
        
        this.el.setAttribute('transform', `translate(${bbox.width - (Theme.WarningIconSize + Theme.NodeHorizontalPadding)}, ${this.top})`);
        
        if (this.isActive(node)) {
            const markup = util.svg /* xml */ `
                <g data-tooltip="${this.tooltip}" width="${Theme.WarningIconSize}" height="${Theme.WarningIconSize}">
                    <image x="0" y="0" width="${Theme.WarningIconSize}" height="${Theme.WarningIconSize}" href="assets/icons/warning.svg"/>
                </g>
            `;
            
            this.renderChildren(markup);
        }
        else {
            this.renderChildren([]);
        }
    }
}
