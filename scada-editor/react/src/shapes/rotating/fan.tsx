import { Directional } from '../directional';
import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import './rotating.css';

// One blade pointing up from the hub; the other two are rotated copies.
const BLADE = 'M 0 0 C 4 -8 16 -20 6 -30 C -2 -26 -8 -14 0 0 Z';
const BLADE_ANGLES = [0, 120, 240];

/** A fan: its housing and guard, three blades around the hub. */
export function FanDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <circle cx={width / 2} cy={height / 2} r={0.45 * width} stroke="#666" strokeWidth={2} {...surface.fill('flat')} />
            <circle cx={width / 2} cy={height / 2} r={34} strokeWidth={1} {...surface.fill('mid')} {...surface.stroke('var(--shape-metal-dark-edge)')} />
            <Directional>
                {/* The blades are drawn around the hub (their group moved there) so they turn in place. */}
                <g transform={`translate(${width / 2},${height / 2})`}>
                    <g className="scada-spin" fill="#bbb" stroke="#222" strokeWidth={2} strokeLinejoin="round">
                        {BLADE_ANGLES.map((angle) => (
                            <path key={angle} d={BLADE} transform={`rotate(${angle})`} />
                        ))}
                    </g>
                </g>
            </Directional>
            <circle cx={width / 2} cy={height / 2} r={5} fill="#333" />
        </>
    );
}
