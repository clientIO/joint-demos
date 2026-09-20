import { dia, ui, util } from '@joint/plus';

import { gateAnchor } from './layout/gate-anchor';
import { isCellVisible } from './layout';
import { AddButton, COLORS, Decision, End, Group, GroupStart, Start, Step } from './shapes';

/** How a simplified element of the map looks: the colors of the diagram, on a rect, a pill or a circle. */
interface Look {
    fill: string;
    stroke: string;
    /** The corner radius as a fraction of the height: 0.5 makes a pill or a circle. */
    corner: number;
}

/**
 * The look of `element` on the map: a step is a white rect outlined in
 * blue, a decision and the start of a group a blue pill, the start and the
 * ends of the diagram green and dark circles, an add button a blue square.
 * A group and the end of a group have no look: they are not drawn.
 */
function getLook(element: dia.Element): Look | null {
    if (Step.isStep(element)) return { fill: COLORS.node.fill, stroke: COLORS.node.stroke, corner: 0.1 };
    if (Decision.isDecision(element) || GroupStart.isGroupStart(element)) return { fill: COLORS.gate.fill, stroke: COLORS.gate.stroke, corner: 0.5 };
    if (Start.isStart(element)) return { fill: COLORS.node.fill, stroke: COLORS.terminal, corner: 0.5 };
    if (End.isEnd(element)) return { fill: COLORS.terminal, stroke: COLORS.terminal, corner: 0.5 };
    if (AddButton.isAddButton(element)) return { fill: COLORS.button.fill, stroke: COLORS.button.fill, corner: 0.15 };
    if (Group.isGroup(element)) return null;
    return null;
}

/**
 * The view of an element on the map: a single rect in the colors of the
 * element, sized and placed like it - no label, no buttons, no measuring.
 * The pattern of the JointJS+ navigator: a view that renders once, and
 * updates on a change of size or position only.
 */
const NavigatorElementView = dia.ElementView.extend({
    body: null as SVGRectElement | null,
    markup: util.svg/* xml */`<rect @selector="body"/>`,
    initFlag: ['RENDER', 'UPDATE', 'TRANSFORM'],
    presentationAttributes: {
        size: ['UPDATE'],
        position: ['TRANSFORM'],
        angle: ['TRANSFORM']
    },
    confirmUpdate(flags: number) {
        if (this.hasFlag(flags, 'RENDER')) this.render();
        if (this.hasFlag(flags, 'UPDATE')) this.update();
        if (this.hasFlag(flags, 'TRANSFORM')) this.updateTransformation();
    },
    render() {
        const { fragment, selectors } = util.parseDOMJSON(this.markup);
        this.body = selectors.body as SVGRectElement;
        this.el.appendChild(fragment);
        this.update();
        this.updateTransformation();
    },
    update() {
        const element = this.model as dia.Element;
        const look = getLook(element);
        const body = this.body as SVGRectElement;
        if (!look) {
            body.setAttribute('display', 'none');
            return;
        }
        const { width, height } = element.size();
        const radius = height * look.corner;
        body.setAttribute('width', String(width));
        body.setAttribute('height', String(height));
        body.setAttribute('rx', String(radius));
        body.setAttribute('ry', String(radius));
        body.setAttribute('fill', look.fill);
        body.setAttribute('stroke', look.stroke);
        body.setAttribute('stroke-width', '2');
    }
});

/**
 * The map of the diagram, floating over the corner of the paper: a `ui.Navigator` that
 * renders the graph again, small, with the simplified views above - the
 * links as they are, their labels hidden by the stylesheet - and the
 * viewport of the scroller drawn over it, to drag around.
 */
export function createNavigator(scroller: ui.PaperScroller): ui.Navigator {
    return new ui.Navigator({
        paperScroller: scroller,
        width: '100%',
        height: '100%',
        padding: 8,
        zoom: false,
        useContentBBox: true,
        paperOptions: {
            elementView: NavigatorElementView,
            // Without `viewManagement` a paper runs in its legacy mode, and
            // calls `cellVisibility` with the view instead of the cell.
            viewManagement: { lazyInitialize: true, disposeHidden: true },
            cellVisibility: (cell) => isCellVisible(cell),
            defaultAnchor: gateAnchor,
            defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }},
            defaultConnector: { name: 'straight', args: { cornerType: 'cubic', cornerRadius: 6 }},
            sorting: dia.Paper.sorting.APPROX,
            overflow: true,
            background: { color: COLORS.background }
        }
    });
}
