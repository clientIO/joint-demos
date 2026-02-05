import { shapes } from '@joint/plus';
import { SubProcess, EventSubProcess } from '../shapes/activity/activity-shapes';
import { IntermediateBoundary } from '../shapes/event/event-shapes';
import { HorizontalSwimlane, VerticalSwimlane } from '../shapes/pool/pool-shapes';

export function importBPMN(paperScroller, commandManager, cells) {
    const paper = paperScroller.options.paper;
    const graph = paper.model;
    const batchName = 'import-bpmn';
    
    paper.freeze();
    graph.startBatch(batchName);
    
    // Process cells before adding them to the graph
    const processedCells = [];
    
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
    const pools = processedCells.filter((cell) => shapes.bpmn2.CompositePool.isPool(cell));
    
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
    commandManager.reset();
    paper.unfreeze();
    
    // Center the content in the viewport
    paperScroller.centerContent({ useModelGeometry: true });
}
