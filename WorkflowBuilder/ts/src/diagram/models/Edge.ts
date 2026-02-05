import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme from '../theme';
import { SystemEdge } from '../../system/diagram/models';

import type { dia, shapes, ui } from '@joint/plus';
import type { SystemEdgeAttributes } from '../../system/diagram/models';

export interface EdgeAttributes extends SystemEdgeAttributes {
}

/** SVG markup for the edge */
const edgeMarkup = util.svg/* xml */`
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

export default class Edge extends SystemEdge<EdgeAttributes> {

    // The type remains the same (explicitly set it here for clarity).
    // We overriding the default engine Edge with our own Edge class.
    static override type = SystemEdge.type;

    preinitialize(): void {
        this.markup = edgeMarkup;
    }

    defaults(): Partial<EdgeAttributes> {
        const attributes: Partial<EdgeAttributes> = {
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

    initialize(attributes: shapes.standard.LinkAttributes, options: dia.Cell.Options): void {
        super.initialize(attributes, options);
    }

    getInspectorConfig(): ui.Inspector.Options {
        const config: ui.Inspector.Options =  {
            headerText: 'Link',
            headerIcon: ICON,
            groups: {},
            inputs: {}
        };
        return config;
    }
}
