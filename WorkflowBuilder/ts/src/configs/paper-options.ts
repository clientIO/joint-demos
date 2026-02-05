/**
 * @file options for the Paper component
 * @see https://docs.jointjs.com/api/dia/Paper#options
 */
import { shapes, dia } from '@joint/plus';

import Theme from '../diagram/theme';

export const gridSize: dia.Paper.Options['gridSize'] = 10;

export const drawGrid: dia.Paper.Options['drawGrid'] = {
    name: 'dot',
    args: { thickness: 0.8 }
};

export const async: dia.Paper.Options['async'] = true;

export const preventDefaultBlankAction: dia.Paper.Options['preventDefaultBlankAction'] = false;

/**
 * A temporary link used only during interactive link creation.
 * (e.g., when dragging from a magnet or starting a connection from a menu)
 * It exists only for the duration of the interaction and is later replaced
 * by the actual link created by the application logic.
 */
export const defaultLink: dia.Paper.Options['defaultLink'] = () => new shapes.standard.Link({
    connector: {
        name: 'curve',
        args: {
            sourceDirection: 'right',
            targetDirection: 'left',
        }
    },
    attrs: {
        line: {
            stroke: Theme.EdgePreviewColor,
            strokeWidth: Theme.EdgeWidth
        },
    }
});


export const connectionStrategy: dia.Paper.Options['connectionStrategy']  = (end, _endView, _endMagnet, _coords, _link, endType) => {

    end.connectionPoint = {
        name: 'anchor'
    };

    if (endType === 'target') {
        end.anchor = {
            name: 'left'
        };
    }

    if (endType === 'source') {
        end.anchor = {
            name: 'right'
        };
    }

    return end;
};

export const snapLinks: dia.Paper.Options['snapLinks'] = {
    radius: 60
};

// Disable the built-in highlighting effects
export const highlighting = {
    [dia.CellView.Highlighting.CONNECTING]: false,
    [dia.CellView.Highlighting.ELEMENT_AVAILABILITY]: false,
};
