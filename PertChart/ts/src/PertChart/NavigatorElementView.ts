import { dia, util } from '@joint/plus';

const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
};

const NavigatorElementView = dia.ElementView.extend({
    body: null,
    markup: util.svg/* xml */`<rect @selector="body" />`,
    // updates run on view initialization
    initFlag: [UpdateFlags.Render, UpdateFlags.Update, UpdateFlags.Transform],
    // updates run when the model attribute changes
    presentationAttributes: {
        position: [UpdateFlags.Transform],
        angle: [UpdateFlags.Transform],
        color: [UpdateFlags.Update],
        size: [UpdateFlags.Update], // shape
    },
    // calls in an animation frame after a multiple changes
    // has been made to the model
    confirmUpdate: function(flags: any) {
        if (this.hasFlag(flags, UpdateFlags.Render)) this.render();
        if (this.hasFlag(flags, UpdateFlags.Update)) this.update();
        // using the original `updateTransformation()` method
        if (this.hasFlag(flags, UpdateFlags.Transform)) this.updateTransformation();
    },
    render: function() {
        const doc = util.parseDOMJSON(this.markup);
        this.body = doc.selectors.body;
        this.body.classList.add(this.model.get('group'));
        this.el.appendChild(doc.fragment);
    },
    update: function() {
        const { model, body } = this;
        // shape
        const { width, height } = model.size();
        body.setAttribute('width', width);
        body.setAttribute('height', height);
        body.setAttribute('rx', 10);
        body.setAttribute('ry', 10);
        // color
        body.setAttribute('fill', model.get('secondaryColor'));
    }
});

export default NavigatorElementView;
