import { useMemo } from 'react';
import { dia, shapes, ui, highlighters } from '@joint/plus';
import { Selection, getSelectionDefaultHandle } from '@joint/react-plus';
import { MAIN_COLOR } from '../configs/theme';

// The selection: rotate/resize handles on the wrapper (shown for multi-cell
// selections) and a mask highlighter frame around each selected cell.
export function BpmnSelection() {

    const frames = useMemo(() => new ui.HighlighterSelectionFrameList({
        highlighter: highlighters.mask,
        selector(cell, _frameList) {
            return cell.isElement() ? cell.attr(['root', 'highlighterSelector']) : null;
        },
        options: (cell, _frameList) => {
            const defaultOptions: dia.HighlighterView.Options = {
                padding: 2,
                attrs: {
                    stroke: MAIN_COLOR,
                    strokeWidth: 2,
                }
            };

            if (shapes.bpmn2.Swimlane.isSwimlane(cell)) {
                defaultOptions.layer = dia.Paper.Layers.FRONT;
            }

            return defaultOptions;
        }
    }), []);

    return (
        <Selection
            options={{
                boxContent: null,
                useModelGeometry: true,
                allowCellInteraction: true
            }}
            wrapper={{
                margin: 8,
                style: {
                    border: `1px solid ${MAIN_COLOR}`
                },
                handles: [
                    {
                        ...getSelectionDefaultHandle('rotate'),
                        group: ui.Selection.HandlePosition.SW
                    },
                    {
                        ...getSelectionDefaultHandle('resize'),
                        group: ui.Selection.HandlePosition.SE
                    }
                ]
            }}
            frames={frames}
        />
    );
}
