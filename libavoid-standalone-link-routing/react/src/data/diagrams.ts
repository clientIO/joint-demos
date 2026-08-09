import { SAVED_GRAPHS } from './cells';
import type { FlowCell } from './cells';
import { generateGraph } from './generate-graph';

export type DiagramKey = 'small' | 'large' | 'stress';

export interface DiagramSource {
    readonly label: string;
    readonly cells: readonly FlowCell[];
}

/**
 * The graphs the picker offers.
 *
 * Built once at module load rather than per selection: switching back to a
 * diagram should show the graph it started as, not a re-randomised one, and
 * re-deriving ~2,000 records on a click would be a stall in the middle of the
 * interaction being demonstrated.
 */
export const DIAGRAMS: Record<DiagramKey, DiagramSource> = {
    small: { label: 'Small — 47 cells', cells: SAVED_GRAPHS.small() },
    large: { label: 'Large — 823 cells', cells: SAVED_GRAPHS.large() },
    stress: { label: 'Stress — 750 nodes, 1250 links, no ports', cells: generateGraph() },
};

export const DEFAULT_DIAGRAM: DiagramKey = 'small';
