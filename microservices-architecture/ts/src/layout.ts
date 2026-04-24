import type { dia } from '@joint/plus';
import { ContainerModel } from './models';

const MARGIN = 40;
const MIN_WIDTH = 250;
const MIN_HEIGHT = 600;
const PADDING = { top: 50, left: 10, right: 10, bottom: 10 };

const OPT = { ignoreCommandManager: true };

/** Returns all containers in the graph sorted by their `index` attribute. */
export function getOrderedContainers(graph: dia.Graph): dia.Element[] {
    return graph.getElements()
        .filter(el => ContainerModel.isContainer(el))
        .sort((a, b) => (a.get('index') ?? 0) - (b.get('index') ?? 0));
}

/**
 * Positions containers left-to-right with uniform height.
 * Fits each container to its children, then applies uniform height and spacing.
 * All changes bypass the CommandManager. Returns the total width used.
 */
export function layoutContainers(graph: dia.Graph): number {
    const containers = getOrderedContainers(graph);

    // First pass: fit each container to its children to get natural sizes
    containers.forEach((container) => {
        const embeds = container.getEmbeddedCells().filter(c => c.isElement());
        if (embeds.length > 0) {
            container.fitToChildren({
                padding: PADDING,
                minRect: { width: MIN_WIDTH, height: MIN_HEIGHT },
                ...OPT
            });
        } else {
            container.resize(MIN_WIDTH, MIN_HEIGHT, OPT);
        }
    });

    // Second pass: find the tallest container and apply uniform height
    const maxHeight = containers.reduce((h, c) => Math.max(h, c.size().height), MIN_HEIGHT);

    // Third pass: resize all to uniform height and position left-to-right
    let x = MARGIN;
    containers.forEach((container) => {
        const { width } = container.size();
        container.resize(width, maxHeight, OPT);
        container.position(x, MARGIN, { deep: true, ...OPT });
        x += width + MARGIN;
    });

    return x;
}

