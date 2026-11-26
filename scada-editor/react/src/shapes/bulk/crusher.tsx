import { Directional } from '../directional';
import type { SymbolProps } from '../types';
import './bulk.css';

// The spokes of the flywheel, around its hub.
const SPOKES = Array.from({ length: 6 }, (_, index) => {
    const angle = (index * Math.PI) / 3;
    return `M 0 0 L ${(20 * Math.cos(angle)).toFixed(2)} ${(20 * Math.sin(angle)).toFixed(2)}`;
}).join(' ');
// The hub of the flywheel (parts of the size): beside the frame, on the shaft of the moving jaw.
const FLYWHEEL = { x: 0.86, y: 0.3 };
// The moving jaw swings from its top (parts of the size).
const JAW_PIVOT = { x: 0.7, y: 0.08 };
// The rocks fed in (relative outlines from a point at parts of the size).
const ROCKS = [
    { x: 0.26, y: 0.2, outline: 'l 10 -8 l 12 4 l -2 12 l -14 2 Z' },
    { x: 0.44, y: 0.16, outline: 'l 12 -4 l 8 10 l -10 8 l -10 -4 Z' },
    { x: 0.38, y: 0.36, outline: 'l 8 -6 l 8 6 l -6 8 Z' },
    { x: 0.41, y: 0.52, outline: 'l 6 -4 l 5 5 l -5 5 Z' },
];

/**
 * A jaw crusher: the rocks fed from the top are crushed between the fixed jaw and the moving one, which the
 * flywheel swings while it runs.
 */
export function CrusherDrawing({ width, height, surface }: SymbolProps) {
    const pivot = { x: JAW_PIVOT.x * width, y: JAW_PIVOT.y * height };
    return (
        <>
            <path
                d={`M ${0.12 * width} ${height} L ${0.2 * width} ${0.7 * height} H ${0.8 * width} L ${0.88 * width} ${height} Z`}
                fill="var(--shape-support)"
                stroke="#333"
                strokeWidth={2}
                strokeLinejoin="round"
            />
            <Directional>
                {/* The frame: wide at the top, the crushed rock falls out of the narrow bottom. */}
                <path
                    d={`M ${0.08 * width} 0 H ${0.78 * width} L ${0.64 * width} ${0.76 * height} H ${0.22 * width} Z`}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    {...surface.fill('plate')}
                    {...surface.stroke('edge')}
                />
                <path
                    d={`M ${0.18 * width} ${0.08 * height} H ${0.68 * width} L ${0.48 * width} ${0.7 * height} H ${0.38 * width} Z`}
                    fill="#2b2f33"
                />
                <path
                    d={ROCKS.map(({ x, y, outline }) => `M ${x * width} ${y * height} ${outline}`).join(' ')}
                    fill={surface.styled('accent', 'var(--shape-hopper-material)')}
                    stroke="#5e4f3d"
                    strokeWidth={1}
                />
                <path
                    d={`M ${0.18 * width} ${0.08 * height} L ${0.38 * width} ${0.7 * height}`}
                    strokeWidth={5}
                    strokeLinecap="round"
                    {...surface.stroke('edge')}
                />
                <path
                    className="scada-jaw"
                    style={{ transformOrigin: `${pivot.x}px ${pivot.y}px` }}
                    d={`M ${pivot.x} ${pivot.y} L ${0.5 * width} ${0.7 * height}`}
                    strokeWidth={5}
                    strokeLinecap="round"
                    {...surface.stroke('edge')}
                />
                <circle cx={FLYWHEEL.x * width} cy={FLYWHEEL.y * height} r={26} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
                {/* The spokes turn about the hub: the group moves them there. */}
                <g transform={`translate(${FLYWHEEL.x * width}, ${FLYWHEEL.y * height})`}>
                    <path className="scada-spokes" d={SPOKES} strokeWidth={3} strokeLinecap="round" {...surface.stroke('edge')} />
                </g>
            </Directional>
        </>
    );
}
