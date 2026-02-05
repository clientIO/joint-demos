import { ui } from '@joint/plus';

export const openFileDropdownToolNames = {
    LOAD_JSON: 'load-json',
    LOAD_XML: 'load-xml'
};

export const openFileDropdownTools = [
    { action: openFileDropdownToolNames.LOAD_JSON, content: 'Load JSON' },
    { action: openFileDropdownToolNames.LOAD_XML, content: 'Load XML' }
];

export const toolbarToolNames = {
    OPEN_FILE_DROPDOWN: 'open-file-dropdown',
    UNDO: 'undo',
    REDO: 'redo',
    PRINT: 'print',
    SAVE_PNG: 'save-png',
    SAVE_JSON: 'save-json',
    SAVE_XML: 'save-xml'
};

export default {
    tools: [
        {
            type: 'button',
            name: toolbarToolNames.OPEN_FILE_DROPDOWN,
            group: 'left',
            attrs: {
                button: {
                    'data-tooltip': 'Open file',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container'
                }
            }
        },
        {
            type: 'separator',
            group: 'left'
        },
        {
            type: 'undo',
            name: toolbarToolNames.UNDO,
            group: 'left',
            attrs: {
                button: {
                    'data-tooltip': 'Undo',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container'
                }
            }
        },
        {
            type: 'redo',
            name: toolbarToolNames.REDO,
            group: 'left',
            attrs: {
                button: {
                    'data-tooltip': 'Redo',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container'
                }
            }
        },
        {
            type: 'separator',
            group: 'left'
        },
        {
            type: 'button',
            name: toolbarToolNames.PRINT,
            group: 'left',
            attrs: {
                button: {
                    'data-tooltip': 'Print',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container'
                }
            }
        },
        {
            type: 'label',
            group: 'right',
            text: 'Save as:'
        },
        {
            type: 'button',
            name: toolbarToolNames.SAVE_PNG,
            group: 'right',
            text: 'PNG'
        },
        {
            type: 'button',
            name: toolbarToolNames.SAVE_JSON,
            group: 'right',
            text: 'JSON'
        },
        {
            type: 'button',
            name: toolbarToolNames.SAVE_XML,
            group: 'right',
            text: 'XML'
        }
    ],
    groups: {
        left: {
            index: 1,
            align: ui.Toolbar.Align.Left
        },
        right: {
            index: 2,
            align: ui.Toolbar.Align.Right
        },
    }
};
