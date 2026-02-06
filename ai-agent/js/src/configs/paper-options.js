/**
 * @file options for the Paper component
 * @see https://docs.jointjs.com/api/dia/Paper#options
 */
import { shapes } from '@joint/plus';
import Theme from '../diagram/theme';

export const gridSize = 10;

export const drawGrid = {
    name: 'dot',
    args: { thickness: 0.8 }
};

export const async = true;

export const preventDefaultBlankAction = false;

export const background = {
    color: Theme.BackgroundColor
};

/**
 * A temporary link used only during interactive link creation.
 * (e.g., when dragging from a magnet or starting a connection from a menu)
 * It exists only for the duration of the interaction and is later replaced
 * by the actual link created by the application logic.
 */
export const defaultLink = () => new shapes.standard.Link({
    attrs: {
        line: {
            stroke: Theme.EdgePreviewColor,
            strokeWidth: 2
        }
    }
});
