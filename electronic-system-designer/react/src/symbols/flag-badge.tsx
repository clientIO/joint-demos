// The validation badge — a small warning triangle pinned to a flagged cell.
// Severity picks the color (index.css); the pulse animation runs once on
// mount so a fresh finding catches the eye without nagging forever.

import type { FindingSeverity } from '@/model/validation';

export interface FlagBadgeProps {
  readonly severity: FindingSeverity;
  /** Badge center. */
  readonly x: number;
  readonly y: number;
}

export function FlagBadge({ severity, x, y }: FlagBadgeProps) {
    return (
        <g className="esd-flag" data-severity={severity} transform={`translate(${x} ${y})`} aria-hidden>
            <polygon className="esd-flag-shape" points="0,-8.5 8,6.5 -8,6.5" />
            <line className="esd-flag-mark" x1={0} y1={-3.5} x2={0} y2={1.5} />
            <circle className="esd-flag-mark-dot" cx={0} cy={4.4} r={0.9} />
        </g>
    );
}
