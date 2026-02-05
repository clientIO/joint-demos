/**
 * @file options for the Toolbar UI component
 * @see https://docs.jointjs.com/api/ui/Toolbar#options
 */
import { ui } from '@joint/plus';
import EditableTextWidget from '../features/EditableTextWidget';

export const widgetNamespace = {
    editableText: EditableTextWidget,
    ...ui.widgets
};

export const tools = [
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
    },
    {
        type: 'button',
        name: 'load',
        text: 'Load',
        group: 'left',
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
        name: 'test',
        text: '▷ Test flow',
        group: 'right'
    },
    {
        type: 'button',
        name: 'publish',
        text: 'Publish',
        group: 'right',
    },
];

export const autoToggle = true;
