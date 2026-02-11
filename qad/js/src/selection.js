import { mvc, V } from '@joint/plus';

export const Selection = mvc.Collection.extend();

export const SelectionView = mvc.View.extend({

    PADDING: 3,

    BOX_TEMPLATE: V('rect', {
        'fill': 'none',
        'stroke': '#C6C7E2',
        'stroke-width': 1,
        'pointer-events': 'none'
    }),

    init: function () {
        this.listenTo(this.model, 'add reset change', this.render);
    },

    render: function () {

        if (this.boxes) {
            this.boxes.forEach(box => box.remove());
        }

        this.boxes = this.model.map(function (element) {
            return this.BOX_TEMPLATE
                .clone()
                .attr(element.getBBox().inflate(this.PADDING))
                .appendTo(this.options.paper.cells);
        }.bind(this));

        return this;
    },

    onRemove: function () {
        if (this.boxes) {
            this.boxes.forEach(box => box.remove());
        }
        delete this.boxes;
    }
});
