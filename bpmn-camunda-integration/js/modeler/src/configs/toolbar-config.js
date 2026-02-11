import { ui } from '@joint/plus';

export const openFileDropdownToolNames = {
    LOAD_XML: 'load-xml',
    DOWNLOAD_XML: 'download-xml'
};

export const openFileDropdownTools = [
    { action: openFileDropdownToolNames.LOAD_XML, content: 'Load BPMN XML' },
    { action: openFileDropdownToolNames.DOWNLOAD_XML, content: 'Download BPMN XML' }
];

export const toolbarToolNames = {
    OPEN_FILE_DROPDOWN: 'open-file-dropdown',
    UNDO: 'undo',
    REDO: 'redo',
    PRINT: 'print',
    CLEAR_DIAGRAM: 'clear-diagram',
    PROCESS_NAME: 'process-name',
    DEPLOY_PROCESS: 'deploy-process',
    LOAD_PROCESS_DROPDOWN: 'load-process-dropdown',
    START_PROCESS_DROPDOWN: 'start-process-dropdown',
    VIEW_XML: 'view-xml'
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
            type: 'separator',
            group: 'left'
        },
        {
            type: 'button',
            name: toolbarToolNames.CLEAR_DIAGRAM,
            group: 'left',
            text: 'Clear Diagram',
            attrs: {
                button: {
                    'data-tooltip': 'Clear the diagram',
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
            type: 'label',
            group: 'left',
            text: 'Process:'
        },
        {
            type: 'inputText',
            name: toolbarToolNames.PROCESS_NAME,
            group: 'left',
            value: 'my_process',
            attrs: {
                input: {
                    'data-tooltip': 'Process name (used as BPMN process ID)',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container',
                    'placeholder': 'Process name'
                }
            }
        },
        {
            type: 'button',
            name: toolbarToolNames.DEPLOY_PROCESS,
            group: 'left',
            text: 'Deploy Process',
            attrs: {
                button: {
                    'data-tooltip': 'Deploy process to Camunda',
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
            name: toolbarToolNames.LOAD_PROCESS_DROPDOWN,
            group: 'left',
            text: 'Load Process',
            attrs: {
                button: {
                    'data-tooltip': 'Load a deployed process into the diagram',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container'
                }
            }
        },
        {
            type: 'button',
            name: toolbarToolNames.START_PROCESS_DROPDOWN,
            group: 'left',
            text: 'Start Process',
            attrs: {
                button: {
                    'data-tooltip': 'Start a deployed process',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container'
                }
            }
        },
        {
            type: 'button',
            name: toolbarToolNames.VIEW_XML,
            group: 'right',
            text: 'View XML',
            attrs: {
                button: {
                    'data-tooltip': 'View BPMN XML source',
                    'data-tooltip-position': 'top',
                    'data-tooltip-position-selector': '.toolbar-container'
                }
            }
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
