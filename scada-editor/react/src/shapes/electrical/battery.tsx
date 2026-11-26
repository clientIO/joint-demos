import type { SymbolProps } from '../types';
import { BATTERY_MINUS_X as MINUS_X, BATTERY_PLUS_X as PLUS_X } from './electrical';

/** A sign on the lid, over its post. */
function Sign({ x, y, text }: { readonly x: number; readonly y: number; readonly text: string }) {
    return (
        <text x={x} y={y} dy="0.3em" textAnchor="middle" fontSize={14} fontFamily="sans-serif" fontWeight="bold" fill="#ffffff">
            {text}
        </text>
    );
}

/** A battery: the posts on its dark lid, the signs of the poles, a sticker on the front. */
export function BatteryDrawing({ width: w, height: h, surface }: SymbolProps) {
    const signY = 0.2 * h + 1;
    return (
        <>
            <rect x={MINUS_X * w - 7} y={-10} width={14} height={12} rx={2} ry={2} fill="#333" stroke="#222" strokeWidth={1.5} />
            <rect x={PLUS_X * w - 7} y={-10} width={14} height={12} rx={2} ry={2} fill="#c0392b" stroke="#222" strokeWidth={1.5} />
            <rect width={w} height={h} rx={4} ry={4} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect width={w} height={0.4 * h} rx={4} ry={4} fill="#2f3a45" stroke="#1f272e" strokeWidth={2} />
            <rect x={0.15 * w} y={0.5 * h} width={0.7 * w} height={0.36 * h} rx={2} ry={2} strokeWidth={1} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <Sign x={MINUS_X * w} y={signY} text="−" />
            <Sign x={PLUS_X * w} y={signY} text="+" />
        </>
    );
}
