import { V, dia, ui } from '@joint/plus';

// The flags of the map view: a render, an update of the size, a move.
const RENDER_FLAG = '@render';
const UPDATE_FLAG = '@update';
const TRANSFORM_FLAG = '@transform';

// The view of an element on the map: a rectangle the size of the element,
// filled with the color of its category (the `color` of the model).
// No text, which the map is too small to read.
class MapElementView extends dia.ElementView {

    private body: SVGRectElement | null = null;

    initFlag(): string[] {
        return [RENDER_FLAG, UPDATE_FLAG, TRANSFORM_FLAG];
    }

    presentationAttributes(): dia.CellView.PresentationAttributes {
        return {
            position: [TRANSFORM_FLAG],
            size: [UPDATE_FLAG],
            color: [UPDATE_FLAG]
        };
    }

    confirmUpdate(flags: number): number {
        if (this.hasFlag(flags, RENDER_FLAG)) this.render();
        if (this.hasFlag(flags, UPDATE_FLAG)) this.update();
        if (this.hasFlag(flags, TRANSFORM_FLAG)) this.updateTransformation();
        return 0;
    }

    render(): this {
        this.body = V('rect', { stroke: 'none', rx: 6, ry: 6 }).node as SVGRectElement;
        this.el.appendChild(this.body);
        return this;
    }

    update(): void {
        const { width, height } = this.model.size();
        V(this.body!).attr({ width, height, fill: this.model.get('color') });
    }
}

// The map of the diagram: a `ui.Navigator` that renders the graph again, small -
// the elements in the color of their category, the links without their labels
// (hidden by the stylesheet). The visible area of the scroller is drawn over it, to drag around.
export function createNavigator(scroller: ui.PaperScroller): ui.Navigator {
    return new ui.Navigator({
        paperScroller: scroller,
        width: 240,
        height: 160,
        padding: 8,
        zoom: false,
        useContentBBox: { useModelGeometry: true },
        paperOptions: {
            elementView: MapElementView,
            // The ends of the links from the models, as on the paper: the map views are not measured.
            defaultAnchor: { name: 'center', args: { useModelGeometry: true }},
            defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }},
            background: { color: '#ffffff' }
        }
    });
}
