import { V, dia, ui } from '@joint/plus';

import { isCellVisible } from './layout';
import { AddButtonModel, COLORS, DecisionModel, EndModel, GroupStartModel, STEP_RADIUS, StartModel, StepModel } from './shapes';

/** The flags of the map view: a render, an update of the size, a move. */
const RENDER_FLAG = '@render';
const UPDATE_FLAG = '@update';
const TRANSFORM_FLAG = '@transform';

/**
 * The look of an element on the map: a fill in the colors of the diagram
 * and the shape of the element - a step a light blue box with its small
 * corners, a decision and the start of a group the blue of the pills, round
 * by half their height, the start and the ends of the diagram dark discs
 * (the start is white on the diagram: invisible on the map without its
 * outline). `null` for the end of a group, drawn with nothing.
 */
function getMapStyle(element: dia.Element): { fill: string; round: boolean; radius: number } | null {
    if (StepModel.isStep(element)) return { fill: COLORS.mapStep, round: false, radius: STEP_RADIUS };
    if (DecisionModel.isDecision(element) || GroupStartModel.isGroupStart(element)) return { fill: COLORS.gate.fill, round: true, radius: 0 };
    if (StartModel.isStart(element) || EndModel.isEnd(element)) return { fill: COLORS.terminal, round: true, radius: 0 };
    return null;
}

/**
 * The view of an element on the map: one rectangle the size of the element,
 * in its shape and color (see `getMapStyle()`) - no text, no icons, no
 * buttons, which the map is too small to read. It renders once, resizes when
 * the element does and moves with it; nothing else of the model reaches it.
 */
class MapElementView extends dia.ElementView {

    private body: SVGRectElement | null = null;

    initFlag(): string[] {
        return [RENDER_FLAG, UPDATE_FLAG, TRANSFORM_FLAG];
    }

    presentationAttributes(): dia.CellView.PresentationAttributes {
        return {
            position: [TRANSFORM_FLAG],
            size: [UPDATE_FLAG]
        };
    }

    confirmUpdate(flags: number): number {
        if (this.hasFlag(flags, RENDER_FLAG)) this.render();
        if (this.hasFlag(flags, UPDATE_FLAG)) this.update();
        if (this.hasFlag(flags, TRANSFORM_FLAG)) this.updateTransformation();
        return 0;
    }

    render(): this {
        const style = getMapStyle(this.model);
        this.body = style ? V('rect', { fill: style.fill, stroke: 'none' }).node as SVGRectElement : null;
        if (this.body) this.el.appendChild(this.body);
        return this;
    }

    update(): void {
        const { body, model } = this;
        const style = getMapStyle(model);
        if (!body || !style) return;
        const { width, height } = model.size();
        const radius = style.round ? height / 2 : style.radius;
        V(body).attr({ width, height, rx: radius, ry: radius });
    }
}

/**
 * The map of the diagram, floating over the corner of the paper: a
 * `ui.Navigator` that renders the graph again, small - the elements through
 * `MapElementView`, the links with the default views, their labels hidden
 * by the stylesheet, and not the add buttons. It hides the content of the
 * collapsed groups like the paper does and fits the content, measured by
 * the model (see `parkHiddenContent()` in `layout/index.ts`). The viewport
 * of the scroller is drawn over it, to drag around.
 */
export function createNavigator(scroller: ui.PaperScroller): ui.Navigator {
    return new ui.Navigator({
        paperScroller: scroller,
        width: '100%',
        height: '100%',
        padding: 8,
        zoom: false,
        useContentBBox: { useModelGeometry: true },
        paperOptions: {
            elementView: MapElementView,
            // The ends of the links from the models, as on the paper: the map views are not measured.
            defaultAnchor: { name: 'center', args: { useModelGeometry: true }},
            defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }},
            // Without `viewManagement` a paper runs in its legacy mode, and
            // calls `cellVisibility` with the view instead of the cell.
            viewManagement: { lazyInitialize: true, disposeHidden: true },
            cellVisibility: (cell) => !AddButtonModel.isAddButton(cell) && isCellVisible(cell),
            overflow: true,
            background: { color: COLORS.background }
        }
    });
}
