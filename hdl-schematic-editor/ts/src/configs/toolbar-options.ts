/**
 * @file options for the Toolbar UI component
 * @see https://docs.jointjs.com/api/ui/Toolbar#options
 */
import { ui } from '@joint/plus';
import EditableTextWidget from '../features/EditableTextWidget';

export const widgetNamespace: ui.Toolbar.Options['widgetNamespace'] = {
    editableText: EditableTextWidget,
    ...ui.widgets
};

export const tools: ui.Toolbar.Options['tools'] = [
    {
        type: 'undo',
        name: 'undo',
        group: 'left',
        attrs: {
            button: {
                'data-tooltip': 'Undo <i>(Ctrl+Z)</i>',
                'data-tooltip-position': 'top'
            }
        }
    },
    {
        type: 'redo',
        name: 'redo',
        group: 'left',
        attrs: {
            button: {
                'data-tooltip': 'Redo <i>(Ctrl+Y)</i>',
                'data-tooltip-position': 'top'
            }
        }
    },
    {
        type: 'separator',
        group: 'left',
    },
    {
        type: 'button',
        name: 'save',
        text: 'Save',
        group: 'left',
        attrs: {
            button: {
                'data-tooltip': 'Download the Yosys JSON',
                'data-tooltip-position': 'top'
            }
        }
    },
    {
        type: 'button',
        name: 'load',
        text: 'Load',
        group: 'left',
        attrs: {
            button: {
                'data-tooltip': 'Open a Yosys JSON file<br/><i>(yosys -p "prep -top top; write_json out.json")</i>',
                'data-tooltip-position': 'top'
            }
        }
    },
    {
        type: 'button',
        name: 'new',
        text: 'New',
        group: 'left',
    },
    {
        type: 'editable-text',
        name: 'diagram-name',
        maxWidth: 700,
        value: '',
        group: 'center',
    },
    {
        type: 'button',
        name: 'layout',
        text: 'Auto layout',
        group: 'right',
        attrs: {
            button: {
                'data-tooltip': 'Arrange the diagram with the ELK layered layout',
                'data-tooltip-position': 'top'
            }
        }
    },
    {
        type: 'button',
        name: 'example',
        text: 'Load example',
        group: 'right'
    },
];

export const autoToggle: ui.Toolbar.Options['autoToggle'] = true;
