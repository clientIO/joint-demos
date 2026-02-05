
export default {
    autoToggle: true,
    theme: 'modern',
    groups: {
        diagram: {
            index: 0,
        },
        idea: {
            index: 1
        },
        other: {
            index: 2
        }
    },
    tools: [
        {
            type: 'undo',
            group: 'diagram'
        },
        {
            type: 'redo',
            group: 'diagram'
        },
        {
            type: 'zoom-in',
            text: 'zoom',
            group: 'diagram'
        },
        {
            type: 'zoom-out',
            text: 'zoom',
            group: 'diagram'
        },
        {
            type: 'separator',
            group: 'idea'
        },
        {
            type: 'button',
            name: 'idea-image',
            text: 'image',
            group: 'idea'
        },
        {
            type: 'color-picker',
            name: 'idea-color',
            text: 'color',
            group: 'idea'
        },
        {
            type: 'separator',
            group: 'other'
        },
        {
            type: 'button',
            name: 'help',
            text: 'help',
            group: 'other'
        },
    ]
};
