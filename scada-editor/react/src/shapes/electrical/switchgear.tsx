import type { SymbolProps } from '../types';
import { energizedOf } from './electrical';
import './electrical.css';

// The panels of the cabinet side by side
const PANELS = 4;
const PANEL_INDEXES = Array.from({ length: PANELS }, (_, i) => i);
// The share of the width of a panel, as the vanilla shape rounds it
const panelPart = (i: number) => Number((i / PANELS).toFixed(3));

/** A switchgear: a row of cabinet panels, a door, a lamp (lit while energized) and a handle on each. */
export function SwitchgearDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const panelX = (i: number, offset = 0) => panelPart(i) * w + offset;
    const energized = energizedOf(data);
    return (
        <>
            <rect width={w} height={h} rx={3} ry={3} strokeWidth={3} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <path d={PANEL_INDEXES.slice(1).map((i) => `M ${panelX(i)} 0 V ${h}`).join(' ')} strokeWidth={2} {...surface.stroke('edge')} />
            {PANEL_INDEXES.map((i) => (
                <g key={i}>
                    <rect
                        x={panelX(i, 8)}
                        y={0.3 * h}
                        width={panelPart(1) * w - 16}
                        height={0.5 * h}
                        rx={2}
                        ry={2}
                        strokeWidth={1.5}
                        {...surface.fill('flat')}
                        {...surface.stroke('edge')}
                    />
                    <circle className="electrical-cabinet-lamp" data-energized={energized} cx={panelX(i + 0.5)} cy={0.15 * h} r={5} fill="#666" stroke="#333" strokeWidth={1} />
                    <rect x={panelX(i + 0.5, -3)} y={0.5 * h} width={6} height={0.12 * h} rx={2} ry={2} fill="#555" />
                </g>
            ))}
        </>
    );
}
