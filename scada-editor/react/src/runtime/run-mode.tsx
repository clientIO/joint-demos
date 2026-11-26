import { useEffect, type ReactNode } from 'react';
import { useGraph } from '@joint/react-plus';
import { PlantControls } from './controls';
import { PlantSession } from './plant-session';
import { useHiddenCursor } from './use-hidden-cursor';

/**
 * Run mode on the paper: the plant runs while it is mounted (a new plant and a new log each time), the controls
 * of the equipment are shown, the cursor hides at rest. Unmounted, the diagram is as it was before the run.
 * Mount it as a child of the diagram's `<Paper>` while running: the controls are overlays of that paper.
 */
export function RunMode(): ReactNode {
    const { graph, setCell, setCellData } = useGraph();
    useEffect(() => {
        const session = new PlantSession({ graph, setCell, setCellData });
        session.start();
        return () => session.stop();
    }, [graph, setCell, setCellData]);
    useHiddenCursor();
    return <PlantControls />;
}
