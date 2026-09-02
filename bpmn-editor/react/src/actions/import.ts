import { fromBPMN } from '@joint/format-bpmn-import';
import { bpmnImportOptions } from '../shapes/factories';
import { SubProcess, EventSubProcess } from '../shapes/activity/activity-shapes';
import { IntermediateBoundary } from '../shapes/event/event-shapes';
import { HorizontalSwimlane, VerticalSwimlane } from '../shapes/pool/pool-shapes';
import { isPool } from '../utils';
import { fitDiagramToViewport } from './fit-diagram';

import type { ui } from '@joint/plus';
import type { dia } from '@joint/plus';

/**
 * Replaces the diagram with the file's content (BPMN XML or JSON), resets
 * the undo history (undoing into the previous diagram makes no sense) and
 * fits the diagram into the viewport. Unsupported or invalid files are
 * reported and skipped.
 */
export async function importFile(paperScroller: ui.PaperScroller, commandManager: dia.CommandManager, file: File): Promise<void> {

    const graph = paperScroller.options.paper.model;

    switch (file.name.split('.').pop()?.toLowerCase()) {
        case 'json': {
            graph.fromJSON(JSON.parse(await file.text()));
            break;
        }
        case 'xml':
        case 'bpmn': {
            const xml = new DOMParser().parseFromString(await file.text(), 'application/xml');
            const { cells, errors } = fromBPMN(xml, bpmnImportOptions);

            if (errors.length > 0) {
                console.warn(errors);
                return;
            }

            importBPMN(graph, cells);
            break;
        }
        default: {
            console.warn('Unsupported file type:', file.name);
            return;
        }
    }

    commandManager.reset();

    fitDiagramToViewport(paperScroller);
}

/**
 * Loads imported cells into the graph, normalizing the structure (unembeds
 * sub-process children, gives empty pools a swimlane, brings boundary events
 * to front).
 */
function importBPMN(graph: dia.Graph, cells: dia.Cell[]): void {
    const batchName = 'import-bpmn';

    graph.startBatch(batchName);

    // Process cells before adding them to the graph
    const processedCells: dia.Cell[] = [];

    // First pass: process all cells (snap to grid, handle embedding)
    for (const cell of cells) {

        const parentId = cell.parent();
        const parent = cells.find((c) => c.id === parentId);
        const isParentSubProcess = parent instanceof SubProcess || parent instanceof EventSubProcess;

        // Skip cells that are embedded into a SubProcess or EventSubProcess
        if (isParentSubProcess && !(cell instanceof IntermediateBoundary)) {
            parent.unembed(cell);
            continue;
        }

        processedCells.push(cell);
    }

    // Reset the graph with all processed cells at once
    graph.resetCells(processedCells);

    // Second pass: handle pools and swimlanes
    const pools = processedCells.filter(isPool);

    pools.forEach((pool) => {
        if (pool.getSwimlanes().length === 0) {
            const attrs = {
                // Set the header text to an empty string to avoid the default 'Lane' text
                headerText: {
                    text: ''
                }
            };

            const swimlane = pool.isHorizontal() ? new HorizontalSwimlane({ attrs }) : new VerticalSwimlane({ attrs });

            const poolBoundaryCells = pool.getEmbeddedCells();
            pool.unembed(poolBoundaryCells);

            // Add the swimlane to the pool
            pool.addSwimlane(swimlane);

            // Re-embed the boundary cells into the swimlane
            swimlane.embed(poolBoundaryCells);
        }

        pool.afterSwimlanesEmbedded();
    });

    const boundaryCells = processedCells.filter((cell) => cell instanceof IntermediateBoundary);
    boundaryCells.forEach((cell) => cell.toFront());

    graph.stopBatch(batchName);
}
