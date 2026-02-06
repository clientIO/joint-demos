import { dia, util } from '@joint/plus';
import Theme from '../theme';

import type Node from '../models/Node';

/**
 * Base class for warning effects displayed on nodes that are not properly configured.
 */
export default abstract class WarningEffect extends dia.HighlighterView {
    tooltip: string = 'Warning: This node is not configured.';
    top: number = 0;

    preinitialize(): void {
        this.tagName = 'g';
        this.className = 'warning-effect';
    }

    highlight(view: dia.ElementView) {
        const node = view.model as Node;
        const bbox = node.getBBox();

        this.el.setAttribute('transform', `translate(${bbox.width - (Theme.WarningIconSize + Theme.NodeHorizontalPadding)}, ${this.top})`);

        if (this.isActive(node)) {
            const markup = util.svg/* xml */`
                <g data-tooltip="${this.tooltip}" width="${Theme.WarningIconSize}" height="${Theme.WarningIconSize}">
                    <image x="0" y="0" width="${Theme.WarningIconSize}" height="${Theme.WarningIconSize}" href="assets/icons/warning.svg"/>
                </g>
            `;

            this.renderChildren(markup);
        } else {
            this.renderChildren([]);
        }
    }

    abstract isActive(node: Node): boolean;
}
