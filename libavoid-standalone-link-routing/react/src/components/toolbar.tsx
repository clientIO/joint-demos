import type { ChangeEvent } from 'react';
import { DIAGRAMS } from '@/data/diagrams';
import type { DiagramKey } from '@/data/diagrams';
import type { RoutingStatus } from '@/routing/use-avoid-router';

export interface ToolbarProps {
    readonly selected: DiagramKey;
    readonly onSelect: (key: DiagramKey) => void;
    readonly cellCount: number;
    readonly status: RoutingStatus;
}

function statusText({ isRouting, durationMs }: RoutingStatus): string {
    if (isRouting) return 'Routing…';
    if (durationMs === null) return 'Idle';
    return `Routed in ${Math.round(durationMs)} ms`;
}

/** Diagram picker plus a readout of what the worker is doing. */
export function Toolbar({ selected, onSelect, cellCount, status }: ToolbarProps) {
    return (
        <header className="toolbar">
            <select
                className="diagram-selector"
                value={selected}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    onSelect(event.target.value as DiagramKey)}
            >
                {Object.entries(DIAGRAMS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
            </select>
            <span className="cell-count">{cellCount} cells</span>
            <span className={`routing-status${status.isRouting ? ' is-routing' : ''}`}>
                {statusText(status)}
            </span>
        </header>
    );
}
