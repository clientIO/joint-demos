import { ui } from '@joint/plus';

export function getToolbarConfig() {
    
    return {
        
        groups: {
            'left': {
                index: 1,
                align: ui.Toolbar.Align.Left
            },
            'right': {
                index: 2,
                align: ui.Toolbar.Align.Right
            },
        },
        
        tools: [
            {
                type: 'button',
                name: 'file',
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
                type: 'separator',
                group: 'left',
            },
            {
                type: 'undo',
                name: 'undo',
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
                name: 'redo',
                group: 'left',
                attrs: {
                    button: {
                        'data-tooltip': 'Redo',
                        'data-tooltip-position': 'top',
                        'data-tooltip-position-selector': '.toolbar-container'
                    }
                }
            }, {
                type: 'separator',
                group: 'left',
            },
        ]
    };
}
