
// Toolbar
export function updateToolbarButtons(app, ideas) {
    const { toolbar } = app;
    const imageWidget = toolbar.getWidgetByName('idea-image');
    const colorWidget = toolbar.getWidgetByName('idea-color');
    switch (ideas.length) {
        case 1: {
            const [idea] = ideas;
            // Upload an image
            imageWidget.enable();
            imageWidget.el.classList.toggle('image-removal', idea.hasImage());
            // Color
            colorWidget.enable();
            colorWidget.setValue(idea.get('userColor') || '#FFFFFF', { silent: true });
            break;
        }
        case 0:
        // multi selection not implemented (use empty selection logic)
        // break omitted
        default: {
            // Upload an image
            imageWidget.disable();
            imageWidget.el.classList.remove('image-removal');
            // Color
            colorWidget.disable();
            colorWidget.setValue('#FFFFFF', { silent: true });
            break;
        }
        
    }
}

