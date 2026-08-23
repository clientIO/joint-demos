import { useMemo } from 'react';
import { dia, ui, highlighters } from '@joint/plus';
import { Selection } from '@joint/react-plus';
import { isSwimlane } from '../utils';

/**
 * The selection: rotate/resize handles on the wrapper (shown for multi-cell
 * selections) and a mask highlighter frame around each selected cell.
 */
export function BpmnSelection() {

    const frames = useMemo(() => new ui.HighlighterSelectionFrameList({
        highlighter: highlighters.mask,
        selector(model) {
            return model.isElement() ? model.attr(['root', 'highlighterSelector']) : null;
        },
        options: (model) => {
            const defaultOptions: dia.HighlighterView.Options = {
                padding: 2,
                attrs: {
                    stroke: 'var(--jj-selector)',
                    strokeWidth: 2,
                }
            };

            if (isSwimlane(model)) {
                defaultOptions.layer = dia.Paper.Layers.FRONT;
            }

            return defaultOptions;
        }
    }), []);

    return (
        <Selection
            wrapper={{
                margin: 8,
                style: {
                    border: '1px solid var(--jj-selector)'
                },
                handles: []
            }}
            frames={frames}
        />
    );
}
