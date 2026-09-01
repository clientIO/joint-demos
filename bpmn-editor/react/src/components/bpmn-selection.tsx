import { useMemo } from 'react';
import { dia, ui, highlighters } from '@joint/plus';
import { Selection } from '@joint/react-plus';
import { isSwimlane } from '../utils';

// The class a selected cell carries, so a stylesheet can reach it. Named as
// the library names it, since that is what a reader will look for.
const SELECTED_CLASS = 'jj-is-selected';

/**
 * The selection frames: a mask highlighter hugging each selected shape, and
 * the selected class on every selected cell.
 *
 * The library offers one or the other — `frames` takes either a frame list
 * (masks, no class) or an options object (class, but rectangular HTML boxes
 * instead of masks) — so the frame list is extended to do both. A shape keeps
 * the outline that follows it, which a box cannot do for a diamond or a
 * circle, and a connector, which has no body to mask, is styled through the
 * class in CSS (see `effects.css`).
 */
class BpmnSelectionFrameList extends ui.HighlighterSelectionFrameList {

    private get classId() {
        return `bpmn-selected-class-${this.selection.cid}`;
    }

    add(cell: dia.Cell) {
        // Only a shape is masked: a connector has no body, and asking for one
        // leaves an unmeasurable node behind.
        if (cell.isElement()) super.add(cell);

        const view = cell.findView(this.paper);
        if (view) {
            highlighters.addClass.add(view, 'root', this.classId, { className: SELECTED_CLASS });
        }
    }

    remove(cell: dia.Cell) {
        if (cell.isElement()) super.remove(cell);

        const view = cell.findView(this.paper);
        if (view) highlighters.addClass.remove(view, this.classId);
    }

    clear() {
        super.clear();
        highlighters.addClass.removeAll(this.paper, this.classId);
    }
}

/**
 * The selection: rotate/resize handles on the wrapper (shown for multi-cell
 * selections), a mask frame around each selected shape, and the selected
 * class on every selected cell.
 */
export function BpmnSelection() {

    const frames = useMemo(() => new BpmnSelectionFrameList({
        highlighter: highlighters.mask,
        selector(model: dia.Cell) {
            return model.attr(['root', 'highlighterSelector']);
        },
        options: (model: dia.Cell) => {
            const defaultOptions: dia.HighlighterView.Options = {
                padding: 2,
                attrs: {
                    stroke: 'var(--bpmn-selector)',
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
                    border: '1px solid var(--bpmn-selector)'
                },
                handles: []
            }}
            frames={frames}
        />
    );
}
