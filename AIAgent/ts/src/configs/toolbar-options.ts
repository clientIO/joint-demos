/**
 * @file options for the Toolbar UI component
 * @see https://docs.jointjs.com/api/ui/Toolbar#options
 */
import type { ui } from '@joint/plus';

export const tools: ui.Toolbar.Options['tools'] = [
    {
        type: 'undo',
        name: 'undo',
        group: 'undo-redo',
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
        group: 'undo-redo',
        attrs: {
            button: {
                'data-tooltip': 'Redo <i>(Ctrl+Y)</i>',
                'data-tooltip-position': 'top'
            }
        }
    },
    {
        type: 'separator'
    },
    {
        type: 'button',
        name: 'save',
        text: 'Save',
        group: 'save-load',
    },
    {
        type: 'button',
        name: 'load',
        text: 'Load',
        group: 'save-load',
    },
    {
        type: 'button',
        name: 'new',
        text: 'New',
        group: 'save-load',
    },
    {
        type: 'separator',
        group: 'save-load'
    },
    {
        type: 'button',
        name: 'test',
        text: '▷ Test agent',
        group: 'run'
    },
    {
        type: 'button',
        name: 'publish',
        text: 'Publish',
        group: 'run',
    },
];

export const autoToggle: ui.Toolbar.Options['autoToggle'] = true;
