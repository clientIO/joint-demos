import type { SymbolProps } from '../types';
import { energizedOf } from './electrical';
import './electrical.css';

/** A lamp: a bulb hanging from its screw base, lit while it is energized. */
export function LampDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const filament = `M ${0.4 * w} 22 L ${0.4 * w} 34 L ${0.45 * w} 40 L ${0.5 * w} 34 L ${0.55 * w} 40 L ${0.6 * w} 34 L ${0.6 * w} 22`;
    return (
        <>
            <circle
                className="electrical-lamp-glass"
                data-energized={energizedOf(data)}
                cx={0.5 * w}
                cy={h - 0.5 * w}
                r={0.5 * w}
                strokeWidth={1.5}
                {...surface.material('glass')}
                {...surface.stroke('edge')}
            />
            <path d={filament} fill="none" stroke="#6b5b3a" strokeWidth={1.5} strokeLinejoin="round" />
            <rect x={0.3 * w} width={0.4 * w} height={22} rx={3} ry={3} strokeWidth={1.5} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path
                d={`M ${0.3 * w} 6 H ${0.7 * w} M ${0.3 * w} 11 H ${0.7 * w} M ${0.3 * w} 16 H ${0.7 * w}`}
                strokeWidth={1.5}
                {...surface.stroke('edge')}
            />
        </>
    );
}
