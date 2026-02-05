import { dia, shapes, V, util, linkTools, elementTools, connectionStrategies, layout, ui } from '@joint/plus';
import { theoryOfChange } from './data';
import type { TheoryOfChange, Solution, Determinant, Problem, Component, Product, SpecificDevelopmentObjective, Indicator, GeneralDevelopmentObjective } from './data';

const config = {
    headerHeight: 120,
    minHeight: 800,
    textMargin: 10,
    assumptions: {
        width: 100,
        dy: 40
    },
    inputs: {
        width: 20,
        dy: 75,
    },
    level1: {
        margin: 10,
        gap: 20,
        buttonHeight: 30,
    },
    level2: {
        y: 80,
        margin: 10,
        gap: 10,
        buttonHeight: 30,
    },
    level3: {
        y: 80,
        margin: 10,
        width: 200,
        height: 50,
        buttonHeight: 30,
        gap: 10,
    }
};

const StackLayout = layout.StackLayout;

const Button = shapes.standard.Rectangle.define('Button', {
    attrs: {
        root: {
            cursor: 'pointer',
        },
        body: {
            stroke: 'none',
            rx: 10,
            ry: 10,
        },
        label: {
            fill: '#6F89B0',
            fontFamily: 'sans-serif',
            textWrap: {
                width: 'calc(w - 10)',
                height: 'calc(h - 10)',
                ellipsis: true,
            }
        }
    }
});

const cellNamespace = { ...shapes, Button };

export const init = () => {

    const form = document.forms.namedItem('form');

    const graph = new dia.Graph({}, { cellNamespace });
    const paper = new dia.Paper({
        el: document.getElementById('paper'),
        model: graph,
        async: true,
        width: 1200,
        height: 1400,
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: cellNamespace,
        defaultConnectionPoint: { name: 'anchor' },
        connectionStrategy: connectionStrategies.pinAbsolute,
        interactive: {
            addLinkFromMagnet: true,
            elementMove: false,
            linkMove: false,
            labelMove: false
        },
        magnetThreshold: 'onleave',
        clickThreshold: 10,
        linkPinning: false,
        labelsLayer: true,
        multiLinks: false,
        overflow: true,
        markAvailable: true,
        highlighting: {
            connecting: {
                name: 'mask',
                options: {
                    padding: 3,
                    attrs: {
                        stroke: '#E68946',
                        strokeWidth: 3,
                    }
                }
            },
            elementAvailability: {
                name: 'addClass',
                options: {
                    className: 'available'
                }
            }
        },
        defaultLink: () => new shapes.standard.Link({
            preview: true,
            attrs: {
                line: {
                    stroke: '#E68946',
                    strokeWidth: 2,
                    strokeDasharray: '5 5',
                    targetMarker: {
                        type: 'path',
                        d: 'M 10 -5 0 0 10 5 Z',
                    }
                }
            }
        }),
        validateConnection: (sourceView, _sourceMagnet, targetView, _targetMagnet) => {
            const source = sourceView.model;
            const target = targetView.model;
            if (target.isLink()) return false;
            if (target.get('type') === 'Button') return false;
            if (source === target) return false;
            if (source.isEmbeddedIn(target) || target.isEmbeddedIn(source)) return false;
            const sourceColumnIndex = source.get('columnIndex');
            const targetColumnIndex = target.get('columnIndex');
            if (Math.abs(sourceColumnIndex - targetColumnIndex) > 1) {
                // Do not allow links between columns that are not adjacent
                return false;
            }
            if (sourceColumnIndex > targetColumnIndex) {
                // Do not allow link from a higher stack to a lower stack
                return false;
            }
            if (sourceColumnIndex === targetColumnIndex) {
                if (source.get('level') !== 3 || target.get('level') !== 3) {
                    // Do not allow links between elements on the same stack that are not level 3
                    return false;
                }
                const sourceParent = source.getParentCell();
                const targetParent = target.getParentCell();
                if (sourceParent !== targetParent) {
                    // If they are not siblings, do not allow the link
                    return false;
                }
            }
            return true;
        }
    });


    const stackLayoutOptions: layout.StackLayout.StackLayoutOptions = {
        direction: StackLayout.Directions.TopBottom,
        alignment: StackLayout.Alignments.End,
        stackSize: config.level3.width + 2 * config.level3.margin + 2 * config.level2.margin + 2 * config.level1.margin + config.assumptions.width,
        stackGap: config.level1.margin,
        stackElementGap: config.level1.gap,
        topLeft: { x: 0, y: config.headerHeight },
        setAttributes: (element, attributes, opt) => {
            const { x, y } = attributes.position;
            // move the embedded elements with the parent
            element.position(x, y, { ...opt, deep: true });
        }
    };

    const stackLayoutView = new ui.StackLayoutView({
        paper,
        validateMoving: ({ targetStack, sourceStack }) => {
            if (targetStack.index !== sourceStack.index) return false;
            return true;
        },
        modifyInsertElementIndex: ({ insertElementIndex, targetStack }) => {
            // The last element in the stack could be the add-button
            const targetStackElements = targetStack.elements;
            if (targetStackElements.length > 0 && targetStackElements.at(-1).get('type') === 'Button') {
                return Math.min(insertElementIndex, targetStack.elements.length - 1);
            }
            return insertElementIndex;
        },
        insertElement: ({ sourceElement, insertElementIndex }) => {
            const siblingsPath = sourceElement.get('path').slice(0, -1);
            const siblings = util.getByPath(theoryOfChange, siblingsPath);
            if (!Array.isArray(siblings)) return;
            const currentElementIndex = sourceElement.get('stackElementIndex');
            const elementData = siblings[currentElementIndex];
            siblings.splice(currentElementIndex, 1);
            siblings.splice(insertElementIndex, 0, elementData);
            buildWithCurrentOptions();
        },
        preview: ({ targetStack, invalid }) => {
            const dx = config.assumptions.width + 2 * config.level1.margin;
            const size = targetStack.bbox.width - dx;
            const x = -targetStack.bbox.width / 2 + dx;

            const preview = V('path', {
                stroke: '#C0692A',
                strokeWidth: 5,
                strokeLinecap: 'round',
                d: `M ${x} 0 h ${size}`,
                display: invalid ? 'none' : 'block'
            });
            return preview.node;
        }
    });

    const assumptionBackground = V('rect').attr({
        stroke: '#F5D6C0',
        strokeWidth: 1,
        fill: '#F6C68E',
        fillOpacity: 0.22,
        rx: 10,
        ry: 10
    });

    const headerLabel = V('text').attr({
        fill: '#666',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        fontSize: 15,
        textAnchor: 'middle',
        pointerEvents: 'none',
    });

    const assumptionBackgrounds = [
        assumptionBackground.clone(),
        assumptionBackground.clone(),
        assumptionBackground.clone()
    ];

    const assumptionLabels = [
        headerLabel.clone().attr('fill', '#E68946').text('Assumptions'),
        headerLabel.clone().attr('fill', '#E68946').text('Assumptions'),
        headerLabel.clone().attr('fill', '#E68946').text('Assumptions')
    ];

    const stackLabels = [
        headerLabel.clone().text('Solutions'),
        headerLabel.clone().text('Determinants'),
        headerLabel.clone().text('Problems')
    ];

    assumptionBackgrounds.forEach((rect) => rect.appendTo(paper.getLayerView(dia.Paper.Layers.BACK).el));
    assumptionLabels.forEach((label) => label.appendTo(paper.getLayerView(dia.Paper.Layers.BACK).el));
    stackLabels.forEach((label) => label.appendTo(paper.getLayerView(dia.Paper.Layers.BACK).el));

    const removeButtonMarkup = util.svg/* xml */`
        <circle r="7" stroke="#FFFFFF" fill="#C0692A" cursor="pointer"/>
        <path d="M -3 -3 3 3 M -3 3 3 -3" fill="none" stroke="#FFFFFF" stroke-width="2" pointer-events="none"/>
    `;

    paper.on('element:pointerclick', (elementView: dia.ElementView) => {
        const element = elementView.model;
        if (element.get('type') === 'Button') {
            const path = element.get('path');
            const siblings = util.getByPath(theoryOfChange, path);
            if (Array.isArray(siblings)) {
                siblings.push({
                    id: util.guid(),
                    description: 'New Item',
                });
            } else if (!siblings) {
                util.setByPath(theoryOfChange, path, [{
                    id: util.guid(),
                    description: 'New Item',
                }]);
            } else {
                return;
            }
            buildWithCurrentOptions();
            return;
        }
        paper.removeTools();
        if (element.id === 'inputs') return;
        const toolsView = new dia.ToolsView({
            tools: [
                new elementTools.Boundary({
                    attributes: {
                        stroke: '#E68946',
                        strokeWidth: 2,
                        rx: 10,
                        ry: 10,
                        fill: 'none'
                    },
                    useModelGeometry: true,
                    padding: 4
                }),
                new elementTools.Remove({
                    scale: 1.5,
                    x: -18,
                    y: 5,
                    markup: removeButtonMarkup,
                    action: () => {
                        const path: any[] = element.get('path');
                        const siblings = util.getByPath(theoryOfChange, path.slice(0, -1));
                        if (Array.isArray(siblings)) {
                            // get the element that is being removed
                            const siblingIdx = path.at(-1);
                            const [removedEl] = siblings.splice(siblingIdx, 1);
                            const removedIds = getAllElementDescendants(removedEl).map(el => el.id);

                            theoryOfChange.assumptionLinks = theoryOfChange.assumptionLinks.filter(link => {
                                return !removedIds.includes(link.fromId) && !removedIds.includes(link.toId);
                            });

                            buildWithCurrentOptions();
                        }
                    }
                })
            ]
        });
        elementView.addTools(toolsView);
    });

    paper.on('blank:pointerclick', () => {
        paper.removeTools();
    });

    paper.on('element:pointerdblclick', (elementView: dia.ElementView) => {
        const path = elementView.model.get('path');
        if (!path) return;
        const data = util.getByPath(theoryOfChange, path);
        if (!data) return;

        const textarea = document.createElement('textarea');
        textarea.value = data.description;

        const dialog = new ui.Dialog({
            id: 'edit-description-dialog',
            theme: 'default',
            width: 400,
            title: `Description for ${data.id}`,
            closeButton: false,
            content: textarea,
            buttons: [
                { action: 'save', content: 'Close' },
            ],
        });

        dialog.on('action:save', () => {
            data.description = textarea.value;
            buildWithCurrentOptions();
            dialog.close();
        });

        dialog.open();
        textarea.focus();
        textarea.select();
    });

    const assumptionCounter = (() => {
        let count = theoryOfChange.assumptionLinks.length;
        return () => ++count;
    })();

    paper.on('link:connect', (linkView: dia.LinkView) => {
        const link = linkView.model;
        theoryOfChange.assumptionLinks.push({
            id: util.guid(),
            fromId: String(link.source().id),
            toId: String(link.target().id),
            assumption: {
                id: util.guid(),
                code: `A${assumptionCounter()}`,
                description: 'New Assumption'
            }
        });
        buildWithCurrentOptions();
    });

    paper.on('link:pointerdown', (linkView: dia.LinkView) => {
        if (!linkView.model.get('preview')) return;
        linkView.getEndView('source').el.classList.add('available');
        paper.el.classList.add('unavailable');
    });
    paper.on('link:pointerup', (linkView: dia.LinkView) => {
        if (!linkView.model.get('preview')) return;
        linkView.getEndView('source').el.classList.remove('available');
        paper.el.classList.remove('unavailable');
    });

    paper.on('link:pointerclick', (linkView: dia.LinkView) => {
        paper.removeTools();
        const removeButton = new linkTools.Remove({
            scale: 1.5,
            distance: 20,
            markup: removeButtonMarkup,
            action: () => {
                const link = linkView.model;
                theoryOfChange.assumptionLinks = theoryOfChange.assumptionLinks.filter(l => l.id !== link.id);
                buildWithCurrentOptions();
            }
        });
        linkView.addTools(new dia.ToolsView({
            tools: [removeButton]
        }));
    });

    buildWithCurrentOptions();

    interface BuildElementOptions {
        maxLevel?: number;
        level1AddButton?: string;
        level2AddButton?: string;
        level3AddButton?: string;
    }

    // Create the elements for the Theory of Change
    function buildElements<I extends Solution | Determinant | Problem>(
        items: I[],
        stackIndex: number,
        level1Key: string,
        level2Key: string,
        level3Key: string,
        options: BuildElementOptions = {}
    ) {
        const level1Elements: dia.Element[] = [];
        const level2Elements: dia.Element[] = [];
        const level3Elements: dia.Element[] = [];
        const {
            level3AddButton = '',
            level2AddButton = '',
            level1AddButton = '',
            maxLevel = 3
        } = options;
        items.forEach((level1item: any, index) => {
            // level 1
            const level1Element = new shapes.standard.HeaderedRectangle({
                id: level1item.id,
                path: [level1Key, index],
                size: {
                    width: config.level3.width + 2 * config.level3.margin + 2 * config.level2.margin,
                    height: config.level2.y
                },
                level: 1,
                markup: [{
                    tagName: 'rect',
                    selector: 'body'
                }, {
                    tagName: 'rect',
                    selector: 'header'
                }, {
                    tagName: 'text',
                    selector: 'headerText'
                }, {
                    tagName: 'text',
                    selector: 'bodyText'
                }, {
                    tagName: 'g',
                    selector: 'dragButton',
                    children: [{
                        tagName: 'rect',
                        attributes: {
                            width: 30,
                            height: 20,
                            x: -5,
                            y: -5,
                            fill: 'transparent',
                        }
                    }, {
                        tagName: 'path',
                        attributes: {
                            d: 'M 0 0 20 0 M 0 5 20 5 M 0 10 20 10',
                            stroke: '#6F89B0',
                            strokeWidth: 3,
                            strokeLinecap: 'round'
                        }
                    }]
                }],
                attrs: {
                    root: {
                        highlighterSelector: 'body',
                    },
                    header: {
                        display: 'none'
                    },
                    body: {
                        magnet: true,
                        rx: 10,
                        ry: 10,
                        stroke: 'none',
                        fill: '#F2F5F7',
                    },
                    headerText: {
                        pointerEvents: 'none',
                        text: level1item.id,
                        fontSize: 16,
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                    },
                    bodyText: {
                        pointerEvents: 'none',
                        y: 40,
                        fontFamily: 'sans-serif',
                        textVerticalAnchor: 'top',
                        text: level1item.description,
                        textWrap: {
                            width: 'calc(w - 10)',
                            height: 40,
                            ellipsis: true,
                        }
                    },
                    dragButton: {
                        cursor: 'grab',
                        transform: 'translate(calc(w - 30), 10)',
                    }
                },
                columnIndex: stackIndex,
                // For the stack layout
                stackIndex,
                stackElementIndex: index,
            });
            level1Elements.push(level1Element);
            // level 2
            if (maxLevel < 2) return;
            const level2Items = Array.isArray(level1item[level2Key])
                ? level1item[level2Key]
                : level1item[level2Key] ? [level1item[level2Key]] : [];
            level2Items.forEach((level2Item: any, level2Index: number) => {
                const level2Element = new shapes.standard.HeaderedRectangle({
                    id: level2Item.id,
                    path: [level1Key, index, level2Key, level2Index],
                    level: 2,
                    size: {
                        width: config.level3.width + 2 * config.level3.margin,
                        height: config.level3.y
                    },
                    attrs: {
                        root: {
                            highlighterSelector: 'body',
                        },
                        header: {
                            display: 'none'
                        },
                        body: {
                            magnet: true,
                            rx: 10,
                            ry: 10,
                            fill: '#DCE6EC',
                            stroke: 'none'
                        },
                        headerText: {
                            pointerEvents: 'none',
                            text: level2Item.id,
                            fontSize: 16,
                            fontWeight: 'bold',
                            fontFamily: 'sans-serif',
                        },
                        bodyText: {
                            pointerEvents: 'none',
                            y: 40,
                            fontFamily: 'sans-serif',
                            textVerticalAnchor: 'top',
                            text: level2Item.description,
                            textWrap: {
                                width: 'calc(w - 10)',
                                height: 40,
                                ellipsis: true,
                            }
                        }
                    },
                    columnIndex: stackIndex,
                });
                level1Element.embed(level2Element);
                level2Elements.push(level2Element);
                // level 3
                if (maxLevel < 3) return;
                const level3Items = Array.isArray(level2Item[level3Key])
                    ? level2Item[level3Key]
                    : (level2Item[level3Key] ? [level2Item[level3Key]] : []);
                level3Items.forEach((level3Item: any, level3Index: number) => {
                    const level3Element = new shapes.standard.Rectangle({
                        id: level3Item.id,
                        path: [level1Key, index, level2Key, level2Index, level3Key, level3Index],
                        level: 3,
                        size: {
                            width: config.level3.width,
                            height: config.level3.height
                        },
                        attrs: {
                            root: {
                                highlighterSelector: 'body',
                            },
                            body: {
                                magnet: true,
                                rx: 10,
                                ry: 10,
                                stroke: '#242424',
                                strokeWidth: 1,
                            },
                            label: {
                                pointerEvents: 'none',
                                text: level3Item.description,
                                fontFamily: 'sans-serif',
                                textWrap: {
                                    width: 'calc(w - 10)',
                                    height: 'calc(h - 10)',
                                    ellipsis: true,
                                }
                            }
                        },
                        columnIndex: stackIndex
                    });
                    level2Element.embed(level3Element);
                    level3Elements.push(level3Element);
                });
                if (level3AddButton) {
                    const level3AddButtonElement = new Button({
                        path: [level1Key, index, level2Key, level2Index, level3Key],
                        size: {
                            width: config.level3.width,
                            height: config.level3.buttonHeight
                        },
                        attrs: {
                            body: {
                                style: {
                                    filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))'
                                }
                            },
                            label: {
                                text: level3AddButton,
                            }
                        }
                    });
                    level3Elements.push(level3AddButtonElement);
                    level2Element.embed(level3AddButtonElement);
                }
            });
            if (level2AddButton) {
                const level2AddButtonElement = new Button({
                    path: [level1Key, index, level2Key],
                    size: {
                        width: config.level3.width + config.level3.margin * 2,
                        height: config.level3.buttonHeight
                    },
                    attrs: {
                        body: {
                            fill: '#DCE6EC'
                        },
                        label: {
                            text: level2AddButton,
                        }
                    }
                });
                level2Elements.push(level2AddButtonElement);
                level1Element.embed(level2AddButtonElement);
            }
        });
        if (level1AddButton) {
            const level1AddButtonElement = new Button({
                path: [level1Key],
                size: {
                    width: config.level3.width + config.level3.margin * 2 + config.level2.margin * 2,
                    height: config.level1.buttonHeight,
                },
                attrs: {
                    body: {
                        fill: '#F2F5F7'
                    },
                    label: {
                        text: level1AddButton,
                    }
                },
                // For the stack layout
                stackIndex,
                stackElementIndex: level1Elements.length
            });
            level1Elements.push(level1AddButtonElement);
        }
        return level1Elements.concat(level2Elements, level3Elements);
    }

    // Lay out all the cells in columns, position the assumption rectangles and the stack labels
    function runLayout(graph: dia.Graph) {
        const elements = graph.getElements().filter(el => !el.isEmbedded());
        // Layout the level 2 & 3 elements
        elements.forEach(level1El => {
            const level2Els = level1El.getEmbeddedCells();
            level2Els.forEach((level2El: dia.Element) => {
                const level3Els = level2El.getEmbeddedCells();
                if (level3Els.length > 0) {
                    level3Els.forEach((level3El: dia.Element, index: number) => {
                        level3El.position(0, (config.level3.height + config.level3.gap) * index);
                    });
                    level2El.fitToChildren({
                        padding: {
                            top: config.level3.y,
                            left: config.level3.margin,
                            right: config.level3.margin,
                            bottom: config.level3.margin
                        }
                    });
                }
            });
            if (level2Els.length > 0) {
                let level2Y = 0;
                level2Els.forEach((level2El: dia.Element) => {
                    level2El.position(-config.level2.margin, level2Y, { deep: true });
                    level2Y += level2El.size().height + config.level2.gap;
                });
                level1El.fitToChildren({
                    padding: {
                        top: config.level2.y,
                        left: config.level2.margin,
                        right: config.level2.margin,
                        bottom: config.level2.margin
                    }
                });
            }
        });

        const result = StackLayout.layout(elements, stackLayoutOptions);
        stackLayoutView.model.stacks = result.stacks;
        stackLayoutView.model.bbox = result.bbox;

        // Layout the assumption rectangles
        result.stacks.forEach(function(stack, index, _stacks) {
            if (index >= assumptionBackgrounds.length) return;
            const { x, y, height } = stack.bbox;
            assumptionBackgrounds[index].attr({
                x: x + config.level1.margin / 2,
                y: y - config.assumptions.dy,
                width: config.assumptions.width,
                height: Math.max(height + config.assumptions.dy, config.minHeight + config.assumptions.dy)
            });
            assumptionLabels[index].attr({
                x: x + config.level1.margin / 2 + config.assumptions.width / 2,
                y: y - config.headerHeight / 2,
                fontSize: 11
            });
        });

        stackLabels.forEach((label, index) => {
            const stack = result.stacks[index];
            const { x, y } = stack.bbox;

            const level1Width = config.level3.width + 2 * config.level3.margin + 2 * config.level2.margin;

            label.attr({
                x: x + config.assumptions.width + config.level1.margin * 2 + level1Width / 2,
                y: y - config.headerHeight / 2
            });
        });

        return result.bbox;
    }

    // Create the cells for the Theory of Change
    function buildTheoryOfChange(data: TheoryOfChange, buildElementOptions: BuildElementOptions = {}) {

        const graph = new dia.Graph({}, { cellNamespace });

        const elements = [];
        elements.push(
            ...buildElements<Solution>(
                data.solutions,
                0,
                'solutions',
                'components',
                'products',
                buildElementOptions
            ),
            ...buildElements<Determinant>(
                data.determinants,
                1,
                'determinants',
                'specificDevelopmentObjectives',
                'impactIndicators',
                buildElementOptions
            ),
            ...buildElements<Problem>(
                data.problems,
                2,
                'problems',
                'generalDevelopmentObjective',
                'impactIndicators',
                buildElementOptions
            ),
        );
        graph.addCells(elements);

        const bbox = runLayout(graph);

        const inputs = new shapes.standard.Rectangle({
            id: 'inputs',
            position: {
                x: bbox.x - config.inputs.width - config.level1.margin,
                y: bbox.y - config.inputs.dy
            },
            size: {
                width: config.inputs.width,
                height: Math.max(bbox.height + config.inputs.dy, config.minHeight + config.inputs.dy)
            },
            attrs: {
                root: {
                    cursor: 'grab',
                },
                body: {
                    fill: '#E68946',
                    stroke: '#C0692A',
                    strokeWidth: 2,
                    rx: 10,
                    ry: 10,
                    magnet: true,
                },
                label: {
                    pointerEvents: 'none',
                    text: 'Activities and Inputs',
                    fill: 'white',
                    fontSize: 16,
                    fontFamily: 'sans-serif',
                    transform: 'rotate(-90, calc(w / 2), calc(h / 2))',
                }
            },
            columnIndex: -1
        });

        graph.addCell(inputs);

        const links = theoryOfChange.assumptionLinks.reduce((acc, assumptionLink) => {

            let router, connector, sourceAnchor, targetAnchor, sourceConnectionPoint, targetPriority;

            const source = graph.getCell(assumptionLink.fromId);
            const target = graph.getCell(assumptionLink.toId);
            if (!source || !target) {
                // The source or target element was filtered out
                return acc;
            }
            const sourceColumnIndex = source.get('columnIndex');
            const targetColumnIndex = target.get('columnIndex');
            if (Math.abs(sourceColumnIndex - targetColumnIndex) > 1) {
                // Do not take into account links between columns that are not adjacent
                return acc;
            }

            const sourceParent = source.getParentCell();
            const targetParent = target.getParentCell();
            const sourceLevel = source.get('level');
            const targetLevel = target.get('level');

            if (sourceParent && sourceParent === targetParent) {
                // sibling to sibling
                router = { name: 'normal' };
                connector = { name: 'curve' };
                sourceAnchor = { name: 'left', args: { dy: 10 }};
                targetAnchor = { name: 'left', args: { dy: -10 }};
            } else {
                router = { name: 'normal' };
                connector = { name: 'curve' };
                if (sourceLevel === 1) {
                    sourceAnchor = { name: 'topRight', args: { dy: config.level2.y / 2 }};
                } else if (sourceLevel === 2) {
                    sourceAnchor = { name: 'topRight', args: { dy: config.level3.y / 2 }};
                } else {
                    sourceAnchor = { name: 'right' };
                }
                if (targetLevel === 1) {
                    targetAnchor = { name: 'topLeft', args: { dy: config.level2.y / 2 }};
                } else if (targetLevel === 2) {
                    targetAnchor = { name: 'topLeft', args: { dy: config.level3.y / 2 }};
                } else {
                    targetAnchor = { name: 'left' };
                }
            }
            if (source.id === 'inputs') {
                sourceConnectionPoint = {
                    name: 'anchor',
                    args: {
                        offset: config.inputs.width / 2
                    }
                };
                sourceAnchor = {
                    name: 'perpendicular',
                    args: {
                        dx: 40
                    }
                };
                targetPriority = true;
            }

            const link = new shapes.standard.Link({
                id: assumptionLink.id,
                source: { id: source.id, anchor: sourceAnchor, connectionPoint: sourceConnectionPoint },
                target: { id: target.id, anchor: targetAnchor, priority: targetPriority },
                router,
                connector,
                attrs: {
                    line: {
                        stroke: '#E68946',
                        strokeWidth: 3,
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 Z',
                        }
                    }
                },
                labels: [{
                    markup: [{
                        tagName: 'ellipse',
                        selector: 'body'
                    }, {
                        tagName: 'text',
                        selector: 'text'
                    }],
                    attrs: {
                        body: {
                            fill: '#E68946',
                            stroke: '#F6F6F6',
                            strokeWidth: 2,
                            cx: 'calc(w / 2)',
                            cy: 'calc(h / 2)',
                            rx: 'calc(w + 12)',
                            ry: 'calc(h + 12)',
                        },
                        text: {
                            fill: '#fff',
                            fontFamily: 'sans-serif',
                            fontSize: 10,
                            text: assumptionLink.assumption.code,
                            textVerticalAnchor: 'middle',
                            textAnchor: 'middle',
                        }
                    }
                }]
            });

            acc.push(link);
            return acc;
        }, []);

        // reset the cell ownership
        graph.resetCells([]);

        return elements.concat([inputs]).concat(links);
    }

    // Form controls

    ['inputLevel', 'inputLevel1AddButton', 'inputLevel2AddButton', 'inputLevel3AddButton'].forEach(name => {
        form[name].addEventListener('change', () => buildWithCurrentOptions());
    });

    function buildWithCurrentOptions() {
        graph.syncCells(
            buildTheoryOfChange(theoryOfChange, {
                maxLevel: parseInt(form['inputLevel'].value),
                level1AddButton: form['inputLevel1AddButton'].checked ? '+ Add Component' : '',
                level2AddButton: form['inputLevel2AddButton'].checked ? '+ Add Product' : '',
                level3AddButton: form['inputLevel3AddButton'].checked ? '+ Add Indicator' : '',
            }),
            { remove: true }
        );
        paper.fitToContent({
            padding: 0,
            minHeight: config.minHeight,
            useModelGeometry: true
        });
    }
};

type TheoryOfChangeElement =
    // Solution and its descendants
    Solution |
    Component |
    Product |
    // Determinant and its descendants
    Determinant |
    SpecificDevelopmentObjective |
    Indicator |
    // Problem and its descendants
    Problem |
    GeneralDevelopmentObjective;

function getAllElementDescendants(element: TheoryOfChangeElement) {
    const descendants: TheoryOfChangeElement[] = [element];
    if (element.hasOwnProperty('components')) {
        // first level solution
        const solution = element as Solution;
        solution.components.forEach(component => {
            descendants.push(...getAllElementDescendants(component));
        });
    } else if (element.hasOwnProperty('products')) {
        // second level solution
        const component = element as Component;
        component.products.forEach(product => {
            descendants.push(...getAllElementDescendants(product));
        });
    } else if (element.hasOwnProperty('specificDevelopmentObjectives')) {
        // first level determinant
        const determinant = element as Determinant;
        determinant.specificDevelopmentObjectives.forEach(specificDevelopmentObjective => {
            descendants.push(...getAllElementDescendants(specificDevelopmentObjective));
        });
    } else if (element.hasOwnProperty('impactIndicators')) {
        // second level determinant/problem
        const problem = element as SpecificDevelopmentObjective | GeneralDevelopmentObjective;
        problem.impactIndicators.forEach(indicator => {
            descendants.push(...getAllElementDescendants(indicator));
        });
    } else if (element.hasOwnProperty('generalDevelopmentObjective')) {
        // first level problem
        const problem = element as Problem;
        problem.generalDevelopmentObjective.forEach(generalDevelopmentObjective => {
            descendants.push(...getAllElementDescendants(generalDevelopmentObjective));
        });
    }

    return descendants;
}
