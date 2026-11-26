import type { SymbolProps } from '../types';

// The bushings on the lid: the high-voltage side, the low-voltage one (parts of the width)
const BUSHINGS = [0.3, 0.7];
// The cooling fins on the sides of the tank (parts of the height)
const FIN_ROWS = [0.2, 0.35, 0.5, 0.65, 0.8];

/** A distribution transformer: a round tank with cooling fins and the porcelain bushings of its two sides on the lid. */
export function TransformerDrawing({ width: w, height: h, surface }: SymbolProps) {
    const sheds = BUSHINGS.map((x) => `M ${x * w - 8} -16 H ${x * w + 8} M ${x * w - 8} -8 H ${x * w + 8}`).join(' ');
    const fins = FIN_ROWS.map((y) => `M 0 ${y * h} H ${0.12 * w} M ${0.88 * w} ${y * h} H ${w}`).join(' ');
    return (
        <>
            {BUSHINGS.map((x) => (
                <rect
                    key={x}
                    x={x * w - 6}
                    y={-22}
                    width={12}
                    height={24}
                    rx={3}
                    ry={3}
                    stroke="var(--shape-porcelain-3)"
                    strokeWidth={1.5}
                    {...surface.material('porcelain')}
                />
            ))}
            <path d={sheds} stroke="var(--shape-porcelain-3)" strokeWidth={3} strokeLinecap="round" />
            <path d={fins} strokeWidth={4} strokeLinecap="round" {...surface.stroke('edge')} />
            <rect x={0.1 * w} y={4} width={0.8 * w} height={h - 4} rx={0.1 * w} ry={6} strokeWidth={2} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <rect x={0.08 * w} width={0.84 * w} height={8} rx={3} ry={3} strokeWidth={2} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
        </>
    );
}
