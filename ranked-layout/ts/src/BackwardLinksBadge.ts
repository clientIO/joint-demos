import { dia, V } from '@joint/core';

export interface BackwardLinksBadgeOptions extends dia.HighlighterView.Options {
    count: number;
}

const HEIGHT = 16;
const PADDING = 5;
// An estimate of the width of a character of the label.
const CHAR_WIDTH = 7;

// The number of the backward links that leave an element, on its top-left corner.
// Its root node has the `data-backward-badge` attribute, so that an event can tell the badge from the element.
export default class BackwardLinksBadge extends dia.HighlighterView<BackwardLinksBadgeOptions> {

    preinitialize() {
        // Redraws the badge when the element is resized.
        this.UPDATE_ATTRIBUTES = ['size'];
    }

    protected highlight() {
        const { count } = this.options;
        const label = `↩ ${count}`;
        const width = 2 * PADDING + CHAR_WIDTH * label.length;
        const title = V('title');
        title.node.textContent = `${count} backward link(s) leave here`;
        // The badge is centered on the corner.
        const rect = V('rect', {
            x: -width / 2,
            y: -HEIGHT / 2,
            width,
            height: HEIGHT,
            rx: HEIGHT / 2,
            ry: HEIGHT / 2
        });
        const text = V('text', {
            x: 0,
            y: 0,
            'text-anchor': 'middle',
            'dominant-baseline': 'central'
        });
        text.node.textContent = label;
        this.vel
            .empty()
            .addClass('ranked-badge')
            .attr('data-backward-badge', 'true')
            .append([title, rect, text]);
    }

    protected unhighlight() {
        this.vel.empty();
    }
}
