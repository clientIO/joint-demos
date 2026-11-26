import type { CSSProperties } from 'react';
import type { SymbolProps } from '../types';
import './electrical.css';

// The cooling ribs of the stator (parts of the width)
const RIB_COLUMNS = [0.22, 0.32, 0.42, 0.52, 0.62, 0.72];
// The key on the shaft: how tall (it sweeps the rest of the shaft's thickness)
const SHAFT_KEY_HEIGHT = 2;

/** A generator (an alternator): the ribbed stator on its feet, the end bell, the shaft and the terminal box on top. */
export function GeneratorDrawing({ width: w, height: h, surface }: SymbolProps) {
    const feet = `M ${0.2 * w} ${0.85 * h} V ${h} M ${0.7 * w} ${0.85 * h} V ${h} M ${0.1 * w} ${h} H ${0.3 * w} M ${0.6 * w} ${h} H ${0.8 * w}`;
    const ribs = RIB_COLUMNS.map((x) => `M ${x * w} ${0.24 * h} V ${0.82 * h}`).join(' ');
    const shaftKeyStyle: CSSProperties & Record<'--shaft-travel', string> = {
        '--shaft-travel': `${Math.max(0, 0.12 * h - SHAFT_KEY_HEIGHT)}px`,
    };
    return (
        <>
            <path d={feet} stroke="#555" strokeWidth={5} strokeLinecap="round" />
            <rect x={0.1 * w} y={0.2 * h} width={0.7 * w} height={0.66 * h} rx={6} ry={6} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <path d={ribs} strokeOpacity={0.55} strokeWidth={2} {...surface.stroke('edge')} />
            <rect x={0.8 * w} y={0.28 * h} width={0.1 * w} height={0.5 * h} rx={4} ry={4} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <rect y={0.47 * h} width={0.1 * w} height={0.12 * h} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <rect
                className="electrical-shaft-key"
                style={shaftKeyStyle}
                x={0.05 * w - 2}
                y={0.47 * h}
                width={4}
                height={SHAFT_KEY_HEIGHT}
                fill="#333"
                opacity={0}
            />
            <rect x={0.375 * w} y={0} width={0.25 * w} height={0.22 * h} rx={2} ry={2} strokeWidth={1.5} {...surface.fill('plate')} {...surface.stroke('edge')} />
        </>
    );
}
