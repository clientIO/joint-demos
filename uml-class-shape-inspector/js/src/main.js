import { dia, ui, shapes, util, setTheme } from '@joint/plus';
import './styles.css';

setTheme('dark');

const typeOptions = [
    {
        value: 0,
        content: 'bool'
    },
    {
        value: 1,
        content: 'currency'
    },
    {
        value: 2,
        content: 'float'
    },
    {
        value: 3,
        content: 'int'
    },
    {
        value: 4,
        content: 'void'
    },
    {
        value: 5,
        content: 'point'
    },
    {
        value: 6,
        content: 'this'
    }
];

const visibilityOptions = [
    {
        value: '+',
        content: 'Public'
    },
    {
        value: '-',
        content: 'Private'
    },
    {
        value: '#',
        content: 'Protected'
    },
    {
        value: '/',
        content: 'Derived'
    },
    {
        value: '~',
        content: 'Package'
    }
];

class UMLClass extends shapes.standard.HeaderedRecord {
    defaults() {
        return {
            ...super.defaults,
            type: 'UMLClass',
            color: '#ffffff',
            outlineColor: '#333333',
            textColor: '#333333',
            headerColor: '#ffffff',
            size: { width: 300, height: 0 },
            itemOffset: 5,
            className: '',
            classType: ''
        };
    }

    initialize(...args) {
        super.initialize(...args);
        this.on('change', (cell, opt) => this.buildItems(opt));
        this.buildItems();
    }

    buildItems(opt = {}) {
        const thickness = 2;
        const {
            className = '',
            classType = '',
            color,
            outlineColor,
            textColor,
            headerColor,
            attributes = [],
            operations = []
        } = this.attributes;

        const buildTypeOptions = [...typeOptions, { value: 7, content: className }];

        const attributesItems = attributes.map((attribute, index) => {
            const {
                visibility = '+',
                name = '',
                returnType = 0,
                isStatic = false
            } = attribute;
            return {
                id: `attribute${index}`,
                label: `${name}: ${buildTypeOptions[returnType].content}`,
                icon: this.getVisibilityIcon(visibility, textColor),
                group: isStatic ? 'static' : null
            };
        });
        if (attributesItems.length === 0) {
            attributesItems.push({
                id: 'no_attributes'
            });
        }

        const operationsItems = operations.map((operation, index) => {
            const {
                visibility = '+',
                name = '',
                returnType = 0,
                parameters = [],
                isStatic = false
            } = operation;

            const nameParams = parameters
                ? parameters.map((parameter) => {
                    const { name = '', type = 0 } = parameter;
                    return `${name}: ${buildTypeOptions[type].content}`;
                })
                : [];

            return {
                id: `operation${index}`,
                label: `${name}(${nameParams.join(',')}): ${buildTypeOptions[returnType].content
                }`,
                icon: this.getVisibilityIcon(visibility, textColor),
                group: isStatic ? 'static' : null
            };
        });
        if (operationsItems.length === 0) {
            operationsItems.push({
                id: 'no_operations'
            });
        }

        let headerHeight = 30;
        let headerText = className;

        if (classType) {
            headerText = `<<${classType}>>\n${headerText}`;
            headerHeight *= 2;
        }

        this.set(
            {
                padding: { top: headerHeight },
                typeOptions: buildTypeOptions,
                attrs: util.defaultsDeep(
                    {
                        body: {
                            stroke: outlineColor,
                            strokeWidth: thickness,
                            fill: color
                        },
                        header: {
                            stroke: outlineColor,
                            strokeWidth: thickness,
                            height: headerHeight,
                            fill: headerColor
                        },
                        headerLabel: {
                            text: headerText,
                            textWrap: {
                                height: headerHeight,
                                width: 'calc(w-10)',
                                preserveSpaces: true,
                                ellipsis: true
                            },
                            fontFamily: 'sans-serif',
                            refY: null,
                            y: headerHeight / 2,
                            lineHeight: 30,
                            fill: textColor
                        },
                        itemLabels: {
                            fontFamily: 'sans-serif',
                            fill: textColor
                        },
                        itemLabels_static: {
                            textDecoration: 'underline'
                        },
                        itemBody_delimiter: {
                            fill: outlineColor
                        }
                    },
                    this.attr()
                ),
                items: [
                    [
                        ...attributesItems,
                        {
                            id: 'delimiter',
                            height: thickness,
                            label: ''
                        },
                        ...operationsItems
                    ]
                ]
            },
            opt
        );
    }

    getVisibilityIcon(visibility, color) {
        const d = {
            '+': 'M 8 0 V 16 M 0 8 H 16',
            '-': 'M 0 8 H 16',
            '#': 'M 5 0 3 16 M 0 5 H 16 M 12 0 10 16 M 0 11 H 16',
            '~': 'M 0 8 A 4 4 1 1 1 8 8 A 4 4 1 1 0 16 8',
            '/': 'M 12 0 L 4 16'
        }[visibility];
        return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                version="1.1"
                viewBox="-3 -3 22 22"
            >
                <path d="${d}" stroke="${color}" stroke-width="2" fill="none"/>
            </svg>`)}`;
    }
}

shapes.UMLClass = UMLClass;
shapes.UMLClassView = shapes.standard.HeaderedRecordView;

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    el: document.getElementById('paper'),
    model: graph,
    cellViewNamespace: shapes,
    width: '50%',
    height: '100%',
    background: {
        color: '#18191b'
    },
    gridSize: 20,
    drawGrid: { name: 'mesh' },
    async: true,
    sorting: dia.Paper.sorting.APPROX
});

const umlClass1 = new UMLClass({
    className: 'Shape',
    classType: 'interface',
    outlineColor: '#ff9580',
    color: '#ffeae5',
    headerColor: '#ffd4cc',
    textColor: '#002b33',
    itemHeight: 25,
    attributes: [
        {
            visibility: '-',
            name: 'x',
            returnType: 2
        },
        {
            visibility: '-',
            name: 'y',
            returnType: 2
        }
    ],
    operations: [
        {
            visibility: '+',
            name: 'getPosition',
            parameters: [],
            returnType: 5
        },
        {
            visibility: '+',
            name: 'setPosition',
            parameters: [
                { name: 'x', type: 2 },
                { name: 'y', type: 2 }
            ],
            returnType: 4
        },
        {
            visibility: '+',
            name: 'isShape',
            parameters: [{ name: 'shape', type: 7 }],
            returnType: 0,
            isStatic: true
        }
    ]
});

graph.addCells([umlClass1]);

const inspectorGeneral = new ui.Inspector({
    cell: umlClass1,
    inputs: {
        className: {
            type: 'text',
            group: 'name',
            label: 'Class name'
        },
        classType: {
            type: 'text',
            group: 'name',
            label: 'Class type'
        },
        color: {
            type: 'color',
            group: 'presentation',
            label: 'Color'
        },
        headerColor: {
            type: 'color',
            group: 'presentation',
            label: 'Header Color'
        },
        outlineColor: {
            type: 'color',
            group: 'presentation',
            label: 'Outline color'
        },
        textColor: {
            type: 'color',
            group: 'presentation',
            label: 'Text color'
        }
    },
    groups: {
        name: {
            index: 1
        },
        presentation: {
            index: 2
        }
    }
});

inspectorGeneral.render();
document.getElementById('inspector-general').appendChild(inspectorGeneral.el);

const inspectorAttributes = new ui.Inspector({
    cell: umlClass1,
    inputs: {
        attributes: {
            type: 'list',
            addButtonLabel: 'Add Attribute',
            item: {
                type: 'object',
                properties: {
                    name: {
                        type: 'text',
                        label: 'Attribute',
                        index: 1
                    },
                    visibility: {
                        type: 'select',
                        options: visibilityOptions,
                        label: 'Visibility',
                        index: 2
                    },
                    returnType: {
                        type: 'select',
                        options: 'typeOptions',
                        label: 'Return type',
                        index: 3
                    },
                    isStatic: {
                        type: 'toggle',
                        index: 4,
                        label: 'Static Attribute'
                    }
                }
            }
        }
    }
});

inspectorAttributes.render();
document
    .getElementById('inspector-attributes')
    .appendChild(inspectorAttributes.el);

const inspectorOperations = new ui.Inspector({
    cell: umlClass1,
    inputs: {
        operations: {
            type: 'list',
            addButtonLabel: 'Add Operation',
            item: {
                type: 'object',
                properties: {
                    name: {
                        type: 'text',
                        label: 'Operation',
                        index: 1
                    },
                    visibility: {
                        type: 'select',
                        options: visibilityOptions,
                        label: 'Visibility',
                        index: 2
                    },
                    returnType: {
                        type: 'select',
                        options: 'typeOptions',
                        label: 'Return type',
                        index: 3
                    },
                    isStatic: {
                        type: 'toggle',
                        index: 4,
                        label: 'Static Operation'
                    },
                    parameters: {
                        type: 'list',
                        item: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'text',
                                    index: 1,
                                    label: 'Parameter name'
                                },
                                type: {
                                    type: 'select',
                                    options: 'typeOptions',
                                    index: 2,
                                    label: 'Parameter type'
                                }
                            }
                        },
                        label: 'Parameters',
                        index: 5
                    }
                }
            }
        }
    }
});

inspectorOperations.render();
document
    .getElementById('inspector-operations')
    .appendChild(inspectorOperations.el);

function openTab(tabName) {
    const t = document.getElementsByClassName('inspector-tab');
    for (let i = 0; i < t.length; i++) {
        t[i].style.display = t[i].id === tabName ? 'block' : 'none';
    }
    const b = document.getElementsByClassName('inspector-tab-button');
    for (let i = 0; i < b.length; i++) {
        b[i].classList.toggle('active', b[i].dataset.inspector === tabName);
    }
}

document.getElementById('inspector').addEventListener('click', (evt) => {
    if (!evt.target.classList.contains('inspector-tab-button')) return;
    openTab(evt.target.dataset.inspector);
});

openTab('inspector-general');

paper.translate(paper.getArea().width / 2 - umlClass1.size().width / 2, 20);
