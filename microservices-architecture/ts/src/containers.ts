import { dia, elementTools } from '@joint/plus';
import { ContainerModel } from './models';
import { getOrderedContainers } from './layout';
import { colors } from './theme';

let nextContainerNumber = 1;

/** Adds a "+" button tool to a container view for inserting new containers. */
export function addContainerTools(
    view: dia.ElementView,
): void {
    const addButton = new elementTools.Button({
        x: 'calc(w + 20)',
        y: 20,
        action: (_evt: dia.Event, v: dia.ElementView) => {
            const container = v.model as ContainerModel;
            addContainer(container.graph, (container.get('index') ?? 0) + 1);
        },
        markup: [{
            tagName: 'circle',
            selector: 'button',
            attributes: {
                r: 12,
                fill: colors.addButtonFill,
                stroke: colors.addButtonStroke,
                strokeWidth: 1,
                cursor: 'pointer',
                class: 'add-container-btn'
            }
        }, {
            tagName: 'text',
            attributes: {
                fill: colors.addButtonIconFill,
                fontSize: 18,
                fontWeight: 'bold',
                textAnchor: 'middle',
                dominantBaseline: 'middle',
                cursor: 'pointer',
                class: 'add-container-btn'
            },
            textContent: '+'
        }]
    });
    const toolsView = new dia.ToolsView({ tools: [addButton] });
    view.addTools(toolsView);
}

/**
 * Creates a new container and inserts it at the given index, shifting
 * existing containers. The entire operation is wrapped in a single batch
 * for atomic undo/redo.
 */
export function addContainer(graph: dia.Graph, insertIndex: number = -1): ContainerModel {

    const containers = getOrderedContainers(graph);

    graph.startBatch('add-container');

    if (insertIndex < 0 || insertIndex > containers.length) {
        insertIndex = containers.length;
    }

    // Shift existing containers at or after insertIndex
    containers.forEach(c => {
        const idx = c.get('index') ?? 0;
        if (idx >= insertIndex) c.set('index', idx + 1);
    });

    const container = ContainerModel.create(`Container ${nextContainerNumber}`);
    nextContainerNumber++;

    container.set('index', insertIndex);
    container.addTo(graph);

    graph.stopBatch('add-container');

    return container;
}
