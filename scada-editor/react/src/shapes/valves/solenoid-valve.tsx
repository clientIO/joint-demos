import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import { BowTie } from './valve-body';
import { isOpen } from './valve-state';

// The letter of the coil while the valve is open (lit) and closed.
const COIL_LIT = 'var(--shape-liquid)';
const COIL_DARK = '#bbb';
// The first line of a text centered vertically (em), as JointJS anchors it.
const MIDDLE_SHIFT = '0.3em';

/** A solenoid valve: the coil on its stem above the bow tie, its letter lit while the valve is open. */
export function SolenoidValveDrawing({ width, height, data, surface }: SymbolProps) {
    const [cx, cy] = [width / 2, height / 2];
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <path d={`M ${cx} ${cy} V -8`} stroke="#555" strokeWidth={3} />
            <BowTie width={width} height={height} />
            <rect
                x={cx - 15}
                y={-32}
                width={30}
                height={24}
                rx={3}
                ry={3}
                stroke="#222"
                strokeWidth={2}
                fill={surface.styled('accent', 'var(--shape-coil)')}
            />
            <text
                x={cx}
                y={-20}
                dy={MIDDLE_SHIFT}
                textAnchor="middle"
                fontSize={14}
                fontFamily="sans-serif"
                fontWeight="bold"
                fill={isOpen(data) ? COIL_LIT : COIL_DARK}
            >
                S
            </text>
        </>
    );
}
