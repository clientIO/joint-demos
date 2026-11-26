import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import { BowTie } from './valve-body';
import { isOpen } from './valve-state';

// How high the handwheel is above the valve: the stem rises when the valve opens.
const HANDWHEEL_OPEN = -36;
const HANDWHEEL_CLOSED = -16;

/** A gate valve with a rising stem: the handwheel up while the valve is open, down when closed. */
export function GateValveDrawing({ width, height, data, surface }: SymbolProps) {
    const [cx, cy] = [width / 2, height / 2];
    const top = isOpen(data) ? HANDWHEEL_OPEN : HANDWHEEL_CLOSED;
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <path d={`M ${cx} ${cy} V ${top}`} stroke="#555" strokeWidth={4} />
            <rect
                x={cx - 8}
                y={-8}
                width={16}
                height={10}
                strokeWidth={1.5}
                {...surface.fill('mid')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
            <rect
                x={cx - 20}
                y={top - 4}
                width={40}
                height={8}
                rx={4}
                ry={4}
                stroke="#333"
                strokeWidth={2}
                fill={surface.styled('accent', 'var(--shape-valve-operator)')}
            />
            <BowTie width={width} height={height} />
        </>
    );
}
