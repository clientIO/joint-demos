import { useMemo, useState } from 'react';
import { ServiceMap } from '@/components/diagram';
import { Toolbar } from '@/components/toolbar';
import { generateGraph } from '@/data/generate-graph';
import { DetailContext } from '@/detail-context';
import type { DetailMode } from '@/detail';

export function App() {
    // Seeded and generated once: the same 1,200 nodes on every load, and none
    // of this re-runs when the detail picker moves.
    const cells = useMemo(() => generateGraph(), []);
    const [mode, setMode] = useState<DetailMode>('auto');

    const nodeCount = cells.filter((cell) => cell.type === 'element').length;

    return (
        // Above <Diagram>, and read by every node: the portals the nodes are
        // rendered into keep the React tree they were created in.
        <DetailContext.Provider value={mode}>
            <div className="app">
                <Toolbar
                    mode={mode}
                    onModeChange={setMode}
                    nodeCount={nodeCount}
                    linkCount={cells.length - nodeCount}
                />
                <ServiceMap cells={cells} />
            </div>
        </DetailContext.Provider>
    );
}
