import { useMemo } from 'react';
import { dia, ui, highlighters } from '@joint/plus';
import { Selection, useCells, useGraph, useSelectionCollection } from '@joint/react-plus';
import { getPoolParent, isSwimlane } from '../utils';

// The class a selected cell carries, so a stylesheet can reach it. Ours, not
// the library's `jj-is-selected`: this code applies it, and the two rules the
// library ships for its own name target react-rendered cells (`jj-box`,
// `jj-link-line`) that this app does not use. Named as the other classes
// applied through `highlighters.addClass` are (see `effects.css`).
const SELECTED_CLASS = 'highlighter-selected';

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

    const { graph } = useGraph();
    const { collection } = useSelectionCollection();

    // Shapes from different participants can be selected together — that is
    // how they are recoloured in one go — but dragging them together would
    // take each out of its own lane to keep the formation, and a lane is
    // defined by what sits in it. So the selection stands and the translate
    // is withheld; a shape still drags on its own.
    const ids = useCells(collection, (cells) => cells.map((cell) => cell.id));
    const spansPools = useMemo(() => {
        const pools = new Set(ids
            .map((id) => graph.getCell(id))
            .filter((cell) => cell?.isElement())
            .map((cell) => getPoolParent(cell)?.id ?? null));

        return pools.size > 1;
    }, [graph, ids]);

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
            allowTranslate={!spansPools}
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
