import { dia, V } from '@joint/plus';

export const ShadowEffect = dia.HighlighterView.extend({
    tagName: 'g',
    className: 'shadow-effect',
    MOUNTABLE: false,

    highlight(cellView: dia.CellView, node: SVGElement) {
        const { offset = 5, blur = 2, opacity = 0.3 } = this.options;

        // Get the model and check if it's an annotation
        const cellModel = cellView.model;
        const isAnnotation = cellModel.get('type') === 'annotation.Annotation';

        // Special handling for annotations, since the only visible part is the border
        if (isAnnotation) {
            // Find the left border path using querySelector
            const borderPath = cellView.el.querySelector('[joint-selector="border"]');

            if (borderPath && borderPath instanceof SVGElement) {
                // Create a clone of the border for the shadow
                const shadowPath = V(borderPath).clone();

                // Apply shadow styling
                shadowPath.attr({
                    stroke: 'black',
                    strokeWidth: 2,
                    transform: `translate(${offset}, ${offset})`,
                    opacity: opacity * 0.5,
                    filter: `blur(${blur}px)`
                });

                this.vel.append(shadowPath);
                cellView.el.prepend(this.el);
                return;
            }
        }

        // Standard SVG filter approach for non-annotation elements
        const filterId = `shadow-filter-${cellView.model.id}`;

        const filter = V('filter').attr({
            id: filterId,
            x: '-50%',
            y: '-50%',
            width: '200%',
            height: '200%'
        });

        filter.append([
            V('feDropShadow').attr({
                dx: offset,
                dy: offset,
                stdDeviation: blur,
                'flood-opacity': opacity,
                'flood-color': 'black'
            })
        ]);

        this.vel.append(filter);

        // Clone the node and apply the filter
        const nodeClone = V(node).clone();
        nodeClone.attr('filter', `url(#${filterId})`);

        this.vel.append(nodeClone);
        cellView.el.prepend(this.el);
    }
});
