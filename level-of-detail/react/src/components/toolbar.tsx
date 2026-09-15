import type { ChangeEvent } from 'react';
import type { DetailMode } from '@/detail';
import { DETAIL_THRESHOLD } from '@/detail';

const MODE_OPTIONS: readonly { readonly value: DetailMode; readonly label: string }[] = [
    { value: 'auto', label: `Auto — card ≥ ${DETAIL_THRESHOLD.high * 100}%, chip ≥ ${DETAIL_THRESHOLD.medium * 100}%` },
    { value: 'high', label: 'Pin to card (HTML)' },
    { value: 'medium', label: 'Pin to chip (SVG)' },
    { value: 'low', label: 'Pin to block (SVG)' },
];

export interface ToolbarProps {
    readonly mode: DetailMode;
    readonly onModeChange: (mode: DetailMode) => void;
    readonly nodeCount: number;
    readonly linkCount: number;
}

/**
 * The detail picker, plus the size of the graph it is acting on.
 *
 * Pinning a level is how the demo shows its own worth: pin the card and fit the
 * map, and the frame rate in the HUD is what level of detail is buying.
 */
export function Toolbar({ mode, onModeChange, nodeCount, linkCount }: ToolbarProps) {
    return (
        <header className="toolbar">
            <h1 className="toolbar-title">Service map</h1>
            <span className="toolbar-count">
                {nodeCount.toLocaleString()} nodes · {linkCount.toLocaleString()} links
            </span>
            <label className="toolbar-field">
                <span>Detail</span>
                <select
                    className="detail-selector"
                    value={mode}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        onModeChange(event.target.value as DetailMode)}
                >
                    {MODE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </label>
        </header>
    );
}
