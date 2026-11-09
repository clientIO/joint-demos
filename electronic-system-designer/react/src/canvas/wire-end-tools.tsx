// End handles on the selected wire: drag one onto another pin to re-pin the
// wire (the cells write-back turns the new end into the Design's pin ref).
// Wires have no hand-made bends — libavoid owns every route.
//
// JointJS 4 attaches link tools through the view, and @joint/react has no
// tools component yet, so this is the one raw JointJS call, in one effect.

import { dia, linkTools } from '@joint/plus';
import { useCells, useGraph, usePaper, useSelectionCollection } from '@joint/react-plus';
import type { CellId } from '@joint/react-plus';
import { useLayoutEffect } from 'react';
import { isWireCell } from '@/views/cell-data';

/** Puts source/target arrowhead tools on the wire while it is the lone selection. */
export function WireEndTools(): null {
    const { paper } = usePaper();
    const { graph } = useGraph();
    const { collection } = useSelectionCollection();
    const wireId = useCells(collection, (cells): CellId | null => {
        const single = cells.length === 1 ? cells[0] : undefined;
        return single !== undefined && single.type === 'link' && isWireCell(single.data) ? single.id : null;
    });

    // A layout effect: JointJS instances attach before paint, per house rule.
    useLayoutEffect(() => {
        if (!paper || wireId === null) return;
        const link = graph.getCell(wireId);
        if (!link || !link.isLink()) return;
        const view = paper.findViewByModel(link);
        if (!view) return;
        view.addTools(new dia.ToolsView({ tools: [new linkTools.SourceArrowhead(), new linkTools.TargetArrowhead()] }));
        return () => {
            view.removeTools();
        };
    }, [paper, graph, wireId]);

    return null;
}
