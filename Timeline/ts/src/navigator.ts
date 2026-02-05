import type { layout } from '@joint/plus';
import { dia, util, ui } from '@joint/plus';

const HEIGHT = 44;
const PADDING = 12;

const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
};

export function setupNavigator(graph: dia.Graph, paperScroller: ui.PaperScroller, tree: layout.TreeLayout) {

    const NavigatorElementView = dia.ElementView.extend({
        body: null,
        markup: util.svg/* xml */`
            <text @selector="body" />
        `,
        // updates run on view initialization
        initFlag: [UpdateFlags.Render, UpdateFlags.Update, UpdateFlags.Transform],
        // updates run when the model attribute changes
        presentationAttributes: {
            position: [UpdateFlags.Transform],
            angle: [UpdateFlags.Transform],
            size: [UpdateFlags.Update], // shape
        },
        // calls in an animation frame after a multiple changes
        // has been made to the model
        confirmUpdate: function(flags) {
            if (this.hasFlag(flags, UpdateFlags.Render)) this.render();
            if (this.hasFlag(flags, UpdateFlags.Update)) this.update();
        },
        render: function() {
            const doc = util.parseDOMJSON(this.markup);
            this.body = doc.selectors.body;
            this.body.classList.add(this.model.get('group'));
            this.el.appendChild(doc.fragment);
        },
        update: function() {
            const { model, body } = this;

            const layoutArea = tree.getLayoutArea(this.model);
            const { x, width } = layoutArea;

            body.textContent = model.attr('label/text').toString().slice(2, 4);

            body.setAttribute('x', x + width / 2);
            body.setAttribute('y', HEIGHT - PADDING * 2);
            body.setAttribute('fill', '#F0F5FF');
            body.setAttribute('text-anchor', 'middle');
            body.setAttribute('dominant-baseline', 'middle');
            body.setAttribute('font-size', Math.min(width * 0.5, 1000));
            body.setAttribute('font-family', 'Nunito Sans');
        }
    });

    const navigator = new ui.Navigator({
        paperScroller,
        height: HEIGHT,
        padding: PADDING,
        width: 300,
        zoom: false,
        paperOptions: {
            async: true,
            overflow: true,
            viewport: (view) => {
                if (view.model.get('type') !== 'timeline.Milestone') return false;
                return true;
            },
            elementView: NavigatorElementView,
        }
    });

    navigator.render();
    navigator.el.style.backgroundColor = '#30608F';
    navigator.el.style.borderRadius = '8px';
    navigator.el.style.border = '1px solid #D3D3D3';

    navigator.listenTo(tree, 'layout:done', () => {
        graph.getElements().forEach((element) => {
            if (element.get('type') !== 'timeline.Milestone') return;
            const elementView = navigator.targetPaper.findViewByModel(element);
            navigator.targetPaper.requestViewUpdate(elementView, elementView.getFlag(UpdateFlags.Update), elementView.UPDATE_PRIORITY);
        });
    });

    document.getElementById('navigator-container').appendChild(navigator.el);
}
