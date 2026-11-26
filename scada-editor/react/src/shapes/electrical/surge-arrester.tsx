import type { SymbolProps } from '../types';

// The sheds of the porcelain housing: at parts of the height
const SHEDS = [0.28, 0.42, 0.56, 0.7];

/** A surge arrester: a porcelain housing with its sheds between metal caps. */
export function SurgeArresterDrawing({ width: w, height: h, surface }: SymbolProps) {
    return (
        <>
            <rect x={0.25 * w} y={0.1 * h} width={0.5 * w} height={0.8 * h} stroke="var(--shape-porcelain-3)" strokeWidth={1.5} {...surface.material('porcelain')} />
            {SHEDS.map((y) => (
                <rect key={y} y={y * h} width={w} height={6} rx={3} ry={3} stroke="var(--shape-porcelain-3)" strokeWidth={1} {...surface.material('porcelain')} />
            ))}
            {[0, 0.88].map((y) => (
                <rect
                    key={y}
                    x={0.15 * w}
                    y={y * h}
                    width={0.7 * w}
                    height={0.12 * h}
                    rx={2}
                    ry={2}
                    strokeWidth={1.5}
                    {...surface.fill('pipe')}
                    {...surface.stroke('edge')}
                />
            ))}
        </>
    );
}
