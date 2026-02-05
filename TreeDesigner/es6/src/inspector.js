import { util, ui } from '@joint/plus';
import { MAX_LEVEL } from './theme';
import { ConnectionDirection, Connections, ConnectionStyle, Shapes } from './enums';

const inputLabel = {
    type: 'content-editable',
    label: 'Label',
    index: 1,
};

const inputType = {
    type: 'select',
    label: 'Type',
    defaultValue: 'device',
    options: [{
            content: 'Computer',
            value: Shapes.Computer
        }, {
            content: 'Cloud',
            value: Shapes.Cloud
        }, {
            content: 'Device',
            value: Shapes.Device
        }, {
            content: 'Line',
            value: Shapes.Line
        }, {
            content: 'Router',
            value: Shapes.Router
        }, {
            content: 'Virtual',
            value: Shapes.Virtual
        }],
    index: 2,
};

const inputId = {
    type: 'text',
    label: 'ID',
    attrs: {
        input: {
            readonly: true
        }
    },
    index: 3,
    defaultValue: () => util.guid()
};

const inputSize = {
    type: 'number',
    label: 'Minimal size',
    index: 4,
};

const inputBoundary = {
    type: 'toggle',
    label: 'Boundary',
    index: 6,
};

const inputBoundaryLabel = {
    type: 'content-editable',
    label: 'Boundary label',
    index: 7,
};

const inputHidden = {
    type: 'toggle',
    label: 'Hidden',
    index: 8,
};


const inputConnections = {
    type: 'select',
    label: 'type',
    defaultValue: 'parallel',
    index: 9,
    options: [{
            content: 'None',
            value: Connections.None
        }, {
            content: 'Parallel',
            value: Connections.Parallel
        }, {
            content: 'Serial',
            value: Connections.Serial
        }, {
            content: 'Branch',
            value: Connections.Branch
        }]
};

const inputConnectionDirection = {
    type: 'select',
    label: 'direction',
    defaultValue: 'none',
    index: 10,
    options: [{
            content: 'None',
            value: ConnectionDirection.None
        }, {
            content: 'Forward',
            value: ConnectionDirection.Forward
        }, {
            content: 'Backward',
            value: ConnectionDirection.Backward
        }, {
            content: 'Bidirectional',
            value: ConnectionDirection.Bidirectional
        }]
};

const inputConnectionStyle = {
    type: 'select',
    label: 'style',
    defaultValue: 'solid',
    index: 11,
    options: [{
            content: 'Solid',
            value: ConnectionStyle.Solid
        }, {
            content: 'Dashed',
            value: ConnectionStyle.Dashed
        }, {
            content: 'Dotted',
            value: ConnectionStyle.Dotted
        }]
};

const inputChildren = {
    type: 'list',
    label: 'Children',
    addButtonLabel: 'Add Child',
    removeButtonLabel: 'Remove Child',
    index: 12,
    item: {
        type: 'object',
        properties: {
            id: inputId,
            type: inputType,
            label: inputLabel,
            size: inputSize,
            hidden: inputHidden,
            boundary: inputBoundary,
            boundaryLabel: inputBoundaryLabel,
            connections: inputConnections,
            connectionStyle: inputConnectionStyle,
            connectionDirection: inputConnectionDirection,
        }
    }
};

function createChildrenInputs(level, path = '') {
    let rootLevelInput = null;
    let levelInput = null;
    while (level > 0) {
        path += '/${index}';
        const nextLevelInput = util.cloneDeep(inputChildren);
        if (levelInput) {
            levelInput.item.properties.children = nextLevelInput;
        }
        else {
            rootLevelInput = nextLevelInput;
        }
        levelInput = nextLevelInput;
        // Build `when` expression with wildcards
        // Show the boundary label input only when the boundary is set to true
        levelInput.item.properties.boundaryLabel.when = {
            eq: {
                [path + '/boundary']: true
            }
        };
        level--;
        path += '/children';
    }
    return rootLevelInput;
}

const inputs = {
    data: {
        id: inputId,
        type: inputType,
        label: inputLabel,
        size: Object.assign(Object.assign({}, inputSize), { when: {
                empty: {
                    'data/children': null
                }
            } }),
        hidden: inputHidden,
        boundary: inputBoundary,
        boundaryLabel: Object.assign(Object.assign({}, inputBoundaryLabel), { when: {
                eq: {
                    'data/boundary': true
                }
            } }),
        connectionDirection: inputConnectionDirection,
        connectionStyle: inputConnectionStyle,
        connections: inputConnections,
        children: createChildrenInputs(MAX_LEVEL, 'data/children')
    }
};

export const createInspector = (dataModel) => {
    const inspector = new ui.Inspector({
        cell: dataModel,
        inputs,
        operators: {
            empty: function (_, value) {
                return util.isEmpty(value);
            }
        },
    });
    return inspector;
};
