import type { App } from '../app';
import type EditableTextWidget from '../features/EditableTextWidget';

export function setToolbarDiagramName(app: App, name: string) {
    const { toolbar } = app;

    const widget: EditableTextWidget = toolbar.getWidgetByName('diagram-name') as EditableTextWidget;
    widget.setValue(name);
}
