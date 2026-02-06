import { dia, ui, shapes } from '@joint/plus';
import './styles.scss';

// Asset imports
import multipleValuesSvg from '../assets/icons/multiple-values.svg';

const colors = {
    shapeStroke: '#ed2637',
    shapeFill: '#f6f6f6',
    text: '#131e29',
    bg: '#dde6e9',
    stencilBg: '#f2f5f8'
};

// Initialize graph and paper

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: colors.bg },
    restrictTranslate: true,
    clickThreshold: 10
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

// Initialize stencil (element palette)

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 100,
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: colors.stencilBg
            }
        };
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 100,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

// Add items to stencil

stencil.load([
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            label: {
                text: '',
                fill: colors.text,
                fontFamily: 'sans-serif'
            },
            body: {
                rx: 0,
                stroke: colors.shapeStroke,
                fill: colors.shapeFill
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            label: {
                text: '',
                fill: colors.text,
                fontFamily: 'sans-serif'
            },
            body: {
                stroke: colors.shapeStroke,
                fill: colors.shapeFill
            }
        }
    }
]);

// Initialize selection

const selection = new ui.Selection({
    paper,
    useModelGeometry: true,
    theme: 'material',
    boxContent: false
});

selection.removeHandle('resize');
selection.removeHandle('rotate');

// Set up JointJS interactions

paper.on('blank:pointerdown', function(evt, x, y) {
    // Drag on an empty area of the paper to initiate selection lasso
    selection.startSelecting(evt);
});

paper.on('element:pointerclick', function(elementView) {
    // Click an element to select it
    selection.collection.reset([elementView.model]);
});

stencil.on('element:drop', function(elementView) {
    // Select dropped element
    selection.collection.reset([elementView.model]);
});

selection.collection.on('reset', function() {
    // Whenever the selection is changed, refresh inspector
    openInspector();
});

function openInspector() {
    // Close inspector, if it was previously open
    ui.Inspector.close();

    // If nothing is selected, do nothing
    const cells = selection.collection.models;
    if (cells.length === 0) return;
    // else: Something is selected - open inspector

    function getTextDefinition(path, label) {
        // Among all selected cells, get the first value of property at given `path`
        const [value, ...otherValues] = cells.map((cell) => cell.prop(path));
        // If more than one cell is selected, do they all have the same value for this property?
        const hasMultipleValues = otherValues.some(
            (otherValue) => value !== otherValue
        );
        // Return information for setting up the inspector field:
        // - If there are multiple values, put "Multiple Values" as placeholder (but not as `value`) of the inspector field
        // - If there is only one value, set it as `value` of the inspector field
        return {
            value: hasMultipleValues ? '' : value || '',
            inspector: {
                type: 'text',
                label,
                attrs: {
                    input: {
                        placeholder: hasMultipleValues ? '⸻' : null
                    }
                }
            }
        };
    }

    function getNumberDefinition(path, label) {
        // Among all selected cells, get the first value of property at given `path`
        const [value, ...otherValues] = cells.map((cell) => cell.prop(path));
        // If more than one cell is selected, do they all have the same value for this property?
        const hasMultipleValues = otherValues.some(
            (otherValue) => value !== otherValue
        );
        // Return information for setting up the inspector field:
        // - If there are multiple values, put "Multiple Values" as placeholder (but not as `value`) of the inspector field
        // - If there is only one value, set it as `value` of the inspector field
        return {
            value: hasMultipleValues ? '' : value || 0,
            inspector: {
                type: 'number',
                label,
                min: 0,
                max: 20,
                attrs: {
                    input: {
                        placeholder: hasMultipleValues ? '⸻' : null
                    }
                }
            }
        };
    }

    function getColorDefinition(path, label) {
        // Among all selected cells, get the first value of property at given `path`
        const [value, ...otherValues] = cells.map((cell) => cell.prop(path));
        // If more than one cell is selected, do they all have the same value for this property?
        const hasMultipleValues = otherValues.some(
            (otherValue) => value !== otherValue
        );
        // Return information for setting up the inspector field:
        // - If there are multiple values, set `undefined` as `value` of the inspector field - this chooses the `undefined` icon
        // - If there is only one value, set it as `value` of the inspector field - this chooses the appropriate color among `options`
        return {
            value: hasMultipleValues ? undefined : value.toLowerCase(),
            inspector: {
                type: 'color-palette',
                options: [
                    {
                        content: undefined,
                        icon: multipleValuesSvg
                    },
                    { content: '#f6f6f6' }, // colors.shapeFill
                    { content: '#dcd7d7' },
                    { content: '#8f8f8f' },
                    { content: '#c6c7e2' },
                    { content: '#feb663' },
                    { content: '#fe854f' },
                    { content: '#ed2637' }, // colors.shapeStroke
                    { content: '#b75d32' },
                    { content: '#31d0c6' },
                    { content: '#7c68fc' },
                    { content: '#61549c' },
                    { content: '#6a6c8a' },
                    { content: '#4b4a67' },
                    { content: '#3c4260' },
                    { content: '#33334e' },
                    { content: '#222138' }
                ],
                label
            }
        };
    }

    // Which properties do all available element shapes (rectangle and ellipse) have in common?
    const labelTextPath = 'attrs/label/text';
    const bodyFillPath = 'attrs/body/fill';
    const bodyStrokePath = 'attrs/body/stroke';
    // - Get information for setting up the common inspector fields:
    const labelTextDef = getTextDefinition(labelTextPath, 'Label');
    const bodyFillDef = getColorDefinition(bodyFillPath, 'Fill Color');
    const bodyStrokeDef = getColorDefinition(bodyStrokePath, 'Outline Color');
    // - Initialize a synthetic cell object to hold the value of all properties shared among selected cells
    const group = new dia.Cell();
    // - Add common property values to the shared cell object
    group.prop(labelTextPath, labelTextDef.value);
    group.prop(bodyFillPath, bodyFillDef.value);
    group.prop(bodyStrokePath, bodyStrokeDef.value);
    // - Initialize an object to hold the inspector setup for each property field, and add common property field definitions to it
    const inputs = {
        [labelTextPath]: labelTextDef.inspector,
        [bodyFillPath]: bodyFillDef.inspector,
        [bodyStrokePath]: bodyStrokeDef.inspector
    };

    // Additional shape-specific properties:
    // - Used if all selected cells are of the same shape type
    if (cells.every((cell) => cell.get('type') === 'standard.Rectangle')) {
        // Rectangle-specific properties:
        const bodyRxPath = 'attrs/body/rx';
        // - Get information for setting up the inspector field
        const bodyRxDef = getNumberDefinition(bodyRxPath, 'Corner Radius');
        // - Add property value to the shared cell object
        group.prop(bodyRxPath, bodyRxDef.value);
        // - Add property field definition to the inspector setup object
        inputs[bodyRxPath] = bodyRxDef.inspector;
    }
    if (cells.every((cell) => cell.get('type') === 'standard.Ellipse')) {
        // Ellipse-specific properties:
        // (none)
    }

    // If a property within the shared cell object changes (i.e. when the user edits the field in the inspector), change the property for all selected cells
    group.on('change', (cell, opt) => {
        if (!opt.inspector) return;
        // Use batch to ensure that all changes are done together
        // - They will be done together for undo/redo too
        graph.startBatch('inspector-bulk-change');
        cells.forEach((cell) =>
            cell.prop(opt.propertyPathArray, opt.propertyValue, opt)
        );
        graph.stopBatch('inspector-bulk-change');
    });

    // Create the inspector based on the shared cell object and the inspector setup object
    // - `cell` = the underlying data (`value` in above code)
    // - `inputs` = Which parts of the underlying data are editable? Which input field represents each of them? What label does each of them have? (`inspector` in above code)
    ui.Inspector.create('#inspector-container', {
        cell: group,
        theme: 'material',
        inputs
    });
}

// Initialize command manager (undo/redo)

const history = new dia.CommandManager({
    graph
});

history.on('stack:undo stack:redo', function() {
    // Make sure to deselect removed elements
    selection.collection.reset(
        selection.collection.filter((cell) => graph.getCell(cell))
    );
});

// Initialize toolbar (to hold undo/redo UI buttons)

const toolbar = new ui.Toolbar({
    autoToggle: true,
    tools: ['undo', 'redo'],
    references: {
        commandManager: history
    }
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

// Initialize sample diagram content (also added to history)

graph.addCells([
    {
        type: 'standard.Rectangle',
        position: { x: 200, y: 200 },
        size: { width: 80, height: 60 },
        attrs: {
            label: {
                text: 'A',
                fill: colors.text,
                fontFamily: 'sans-serif'
            },
            body: {
                rx: 0,
                stroke: colors.shapeStroke,
                fill: colors.shapeFill
            }
        }
    },
    {
        type: 'standard.Ellipse',
        position: { x: 300, y: 300 },
        size: { width: 80, height: 60 },
        attrs: {
            label: {
                text: 'B',
                fill: colors.text,
                fontFamily: 'sans-serif'
            },
            body: {
                stroke: colors.shapeStroke,
                fill: '#dcd7d7'
            }
        }
    }
]);

// Select all initial sample elements

selection.collection.reset(graph.getElements());
