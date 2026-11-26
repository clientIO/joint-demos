import type { SymbolProps } from '../types';
import { energizedOf } from './electrical';
import './electrical.css';

// The drawers (the starters of the motors), one above the other
const DRAWERS = 5;
const DRAWER_INDEXES = Array.from({ length: DRAWERS }, (_, i) => i);
// The top of a drawer, as a part of the height (as the vanilla shape rounds it)
const drawerPart = (i: number) => Number((0.06 + (i * 0.88) / DRAWERS).toFixed(3));
const DRAWER_PART = Number((0.88 / DRAWERS).toFixed(3));

/** A motor control center: a cabinet of drawers, a lamp (lit while energized) and a handle on each. */
export function MotorControlCenterDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const drawerY = (i: number, offset = 0) => drawerPart(i) * h + offset;
    const energized = energizedOf(data);
    return (
        <>
            <rect width={w} height={h} rx={3} ry={3} strokeWidth={3} {...surface.fill('plate')} {...surface.stroke('edge')} />
            {DRAWER_INDEXES.map((i) => (
                <g key={i}>
                    <rect
                        x={8}
                        y={drawerY(i, 3)}
                        width={w - 16}
                        height={DRAWER_PART * h - 6}
                        rx={2}
                        ry={2}
                        strokeWidth={1.5}
                        {...surface.fill('flat')}
                        {...surface.stroke('edge')}
                    />
                    <circle className="electrical-cabinet-lamp" data-energized={energized} cx={22} cy={drawerY(i + 0.5)} r={4} fill="#666" stroke="#333" strokeWidth={1} />
                    <rect x={w - 34} y={drawerY(i + 0.5, -3)} width={18} height={6} rx={2} ry={2} fill="#555" />
                </g>
            ))}
        </>
    );
}
