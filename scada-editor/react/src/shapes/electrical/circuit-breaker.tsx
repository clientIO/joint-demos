import type { SymbolProps } from '../types';

/** A molded-case circuit breaker: the lever up and ON in red while closed, down and OFF in green while open. */
export function CircuitBreakerDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const isOpen = Boolean(data.plant?.open);
    return (
        <>
            <rect width={w} height={h} rx={4} ry={4} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect x={0.15 * w} y={0.12 * h} width={0.7 * w} height={0.76 * h} rx={3} ry={3} fill="#3a434c" stroke="#222" strokeWidth={1.5} />
            <rect x={0.5 * w - 5} y={0.2 * h} width={10} height={0.36 * h} rx={3} ry={3} fill="#1a1f24" />
            <rect x={0.5 * w - 8} y={(isOpen ? 0.4 : 0.2) * h} width={16} height={0.16 * h} rx={3} ry={3} fill="#e6e9ec" stroke="#222" strokeWidth={1.5} />
            <rect
                x={0.25 * w}
                y={0.64 * h}
                width={0.5 * w}
                height={0.16 * h}
                rx={2}
                ry={2}
                fill={isOpen ? 'var(--shape-breaker-open)' : 'var(--shape-breaker-closed)'}
            />
            <text x={0.5 * w} y={0.72 * h} dy="0.3em" textAnchor="middle" fontSize={11} fontFamily="sans-serif" fontWeight="bold" fill="#ffffff">
                {isOpen ? 'OFF' : 'ON'}
            </text>
        </>
    );
}
