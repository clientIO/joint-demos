import type { SymbolProps } from '../types';
import './electrical.css';

// The lines of the cooling grille of the radiator (parts of the height)
const GRILLE_ROWS = [0.32, 0.44, 0.56, 0.68];
// The ribs of the alternator (parts of the width)
const RIB_COLUMNS = [0.66, 0.77, 0.88];

/** A diesel generator set: an engine and an alternator on a skid, its exhaust stack (smoking while it runs). */
export function DieselGeneratorDrawing({ width: w, height: h, surface }: SymbolProps) {
    const grille = GRILLE_ROWS.map((y) => `M ${0.08 * w} ${y * h} H ${0.26 * w}`).join(' ');
    const ribs = RIB_COLUMNS.map((x) => `M ${x * w} ${0.3 * h} V ${0.86 * h}`).join(' ');
    return (
        <>
            <g className="electrical-smoke" fill="var(--shape-smoke)" opacity={0}>
                <circle cx={0.17 * w} cy={-30} r={8} />
                <circle cx={0.17 * w + 8} cy={-44} r={11} />
            </g>
            <rect x={0.17 * w - 6} y={-22} width={12} height={0.2 * h + 22} strokeWidth={2} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <rect y={h - 12} width={w} height={12} rx={2} ry={2} fill={surface.styled('accent', 'var(--shape-skid)')} stroke="#333" strokeWidth={1.5} />
            <rect y={0.2 * h} width={0.54 * w} height={0.68 * h} rx={4} ry={4} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <path d={grille} strokeWidth={2} strokeLinecap="round" {...surface.stroke('edge')} />
            <rect
                x={0.54 * w}
                y={0.28 * h}
                width={0.46 * w}
                height={0.6 * h}
                rx={0.06 * w}
                ry={0.3 * h}
                strokeWidth={2}
                {...surface.fill('pipe')}
                {...surface.stroke('edge')}
            />
            <path d={ribs} strokeOpacity={0.5} strokeWidth={1.5} {...surface.stroke('edge')} />
        </>
    );
}
