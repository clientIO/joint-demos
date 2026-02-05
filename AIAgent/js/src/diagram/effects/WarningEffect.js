import { dia, util } from '@joint/plus';

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
        
        this.el.setAttribute('transform', `translate(${bbox.width - 40}, ${this.top})`);
        
        if (this.isActive(node)) {
            const markup = util.svg /* xml */ `
                <g data-tooltip="${this.tooltip}" width="24" height="24">
                    <image x="0" y="0" width="24" height="24" href="assets/icons/warning.svg"/>
                </g>
            `;
            
            this.renderChildren(markup);
        }
        else {
            this.renderChildren([]);
        }
    }
}
