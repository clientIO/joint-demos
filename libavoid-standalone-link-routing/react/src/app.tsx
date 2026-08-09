import { useCallback, useState } from 'react';
import { FlowDiagram } from '@/components/diagram';
import { Toolbar } from '@/components/toolbar';
import { DEFAULT_DIAGRAM, DIAGRAMS } from '@/data/diagrams';
import type { DiagramKey } from '@/data/diagrams';
import type { RoutingStatus } from '@/routing/use-avoid-router';

const INITIAL_STATUS: RoutingStatus = { isRouting: true, durationMs: null };

export function App() {
    const [selected, setSelected] = useState<DiagramKey>(DEFAULT_DIAGRAM);
    const [status, setStatus] = useState<RoutingStatus>(INITIAL_STATUS);
    const { cells } = DIAGRAMS[selected];

    const onSelect = useCallback((key: DiagramKey) => {
        setStatus(INITIAL_STATUS);
        setSelected(key);
    }, []);

    return (
        <div className="app">
            <Toolbar
                selected={selected}
                onSelect={onSelect}
                cellCount={cells.length}
                status={status}
            />
            {/*
              * Keyed on the diagram, so choosing the other one tears the whole
              * thing down and builds it again: a new graph, a new paper with a
              * fresh virtual-rendering controller, and — the reason this is a
              * remount rather than a `resetCells` — a new worker, with no
              * pending debounce or leftover Libavoid shape from the graph
              * before it.
              */}
            <FlowDiagram key={selected} cells={cells} onStatusChange={setStatus} />
        </div>
    );
}
