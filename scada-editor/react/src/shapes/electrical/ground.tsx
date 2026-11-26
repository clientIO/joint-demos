import type { SymbolProps } from '../types';

/** The ground: a copper rod driven into the soil, the clamp at its top. */
export function GroundDrawing({ width: w, height: h, surface }: SymbolProps) {
    return (
        <>
            <rect y={0.45 * h} width={w} height={0.55 * h} rx={3} ry={3} fill={surface.styled('accent', 'var(--shape-soil)')} fillOpacity={0.55} />
            <path d={`M 0 ${0.45 * h} H ${w}`} stroke="#5f7f3a" strokeWidth={3} />
            <rect x={0.5 * w - 4} width={8} height={0.95 * h} rx={3} ry={3} stroke="var(--shape-copper-3)" strokeWidth={1} {...surface.material('copper')} />
            <rect x={0.5 * w - 9} y={0.12 * h} width={18} height={10} rx={2} ry={2} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
        </>
    );
}
