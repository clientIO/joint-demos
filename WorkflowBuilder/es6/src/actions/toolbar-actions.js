
export function setToolbarDiagramName(app, name) {
    const { toolbar } = app;
    
    const widget = toolbar.getWidgetByName('diagram-name');
    widget.setValue(name);
}
