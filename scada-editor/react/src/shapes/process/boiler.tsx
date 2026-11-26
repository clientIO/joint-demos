import type { SymbolProps } from '../types';
import './process.css';

const FLAME_OUTER = 'M -22 10 C -28 -8 -12 -14 -14 -30 C -4 -20 0 -28 2 -42 C 12 -26 26 -18 22 10 Z';
const FLAME_INNER = 'M -10 10 C -14 -2 -4 -6 -4 -16 C 2 -10 4 -16 6 -24 C 12 -14 16 -6 12 10 Z';
// The flames stand on the floor of the firebox, this far above the bottom.
const FLAMES_BASE = 18;
// The inner flame: the color of the outer one, this much of it, darkened.
const INNER_FLAME_SHARE = 78;
const INNER_FLAME_DARK = '#8b1e1e';

/** A boiler: the drum, the firebox low in it, the flames while the burner is on. */
export function BoilerDrawing({ width, height, data, surface }: SymbolProps) {
    const isFiring = Boolean(data.plant?.power);
    const flames = `translate(${width / 2},${height - FLAMES_BASE})`;
    const outerFlame = surface.styled('accent', 'var(--shape-flame)');
    return (
        <>
            <rect x={0.5 * width - 10} y={-16} width={20} height={20} strokeWidth={2} {...surface.fill('flat-2')} {...surface.stroke('edge')} />
            <rect width={width} height={height} rx={0.5 * width} ry={20} strokeWidth={4} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <rect x={0.2 * width} y={height - 70} width={0.6 * width} height={56} rx={4} ry={4} fill="#333" stroke="#222" strokeWidth={2} />
            {/* Out: the firebox dark. */}
            <path className="scada-flame-outer" d={FLAME_OUTER} transform={flames} fill={outerFlame} display={isFiring ? 'block' : 'none'} />
            <path
                className="scada-flame-inner"
                d={FLAME_INNER}
                transform={flames}
                fill={`color-mix(in oklab, ${outerFlame} ${INNER_FLAME_SHARE}%, ${INNER_FLAME_DARK})`}
                display={isFiring ? 'block' : 'none'}
            />
        </>
    );
}
