/**
 * @file options for the Paper component
 * @see https://docs.jointjs.com/api/dia/Paper#options
 */
import { shapes } from '@joint/plus';
import Theme from '../diagram/theme';

import type { dia } from '@joint/plus';

export const gridSize: dia.Paper.Options['gridSize'] = 16;

export const drawGrid: dia.Paper.Options['drawGrid'] = {
    name: 'dot',
    args: { thickness: 0.8 }
};

export const async: dia.Paper.Options['async'] = true;

export const preventDefaultBlankAction: dia.Paper.Options['preventDefaultBlankAction'] = false;

export const background: dia.Paper.Options['background'] = {
    color: Theme.BackgroundColor
};

/**
 * A temporary link used only during interactive link creation.
 * (e.g., when dragging from a magnet or starting a connection from a menu)
 * It exists only for the duration of the interaction and is later replaced
 * by the actual link created by the application logic.
 */
export const defaultLink: dia.Paper.Options['defaultLink'] = () => new shapes.standard.Link({
    attrs: {
        line: {
            stroke: Theme.EdgePreviewColor,
            strokeWidth: 2,
            // Do not apply transition to the link that is dragged from magnets - see styles/app.scss
            class: 'no-transition'
        }
    },
    connector: {
        name: 'curve'
    }
});
