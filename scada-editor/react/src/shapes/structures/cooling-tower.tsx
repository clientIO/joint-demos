import { useId } from 'react';
import type { SymbolProps } from '../types';
import './structures.css';

/** A hyperboloid cooling tower: the plume of the water vapor out of its top, the air inlets around its bottom. */
export function CoolingTowerDrawing({ width, height, surface }: SymbolProps) {
    // Its own gradient: an element's ids are its own, in the palette and an export too.
    const steamId = `steam${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const plume = [
        `M ${0.2 * width} 10`,
        `C ${0.06 * width} 0 ${0.1 * width} -30 ${0.26 * width} -28`,
        `C ${0.26 * width} -50 ${0.5 * width} -58 ${0.58 * width} -40`,
        `C ${0.7 * width} -58 ${0.94 * width} -48 ${0.88 * width} -26`,
        `C ${width} -20 ${0.94 * width} 4 ${0.8 * width} 10`,
        'Z',
    ].join(' ');
    const plumeShade = [
        `M ${0.22 * width} 10`,
        `C ${0.2 * width} -8 ${0.4 * width} -12 ${0.5 * width} -4`,
        `C ${0.62 * width} -14 ${0.82 * width} -8 ${0.8 * width} 10`,
        'Z',
    ].join(' ');
    const wisp = [
        `M ${0.78 * width} -54`,
        `C ${0.84 * width} -70 ${1.02 * width} -72 ${1.04 * width} -60`,
        `C ${1.08 * width} -52 ${0.9 * width} -46 ${0.78 * width} -54`,
        'Z',
    ].join(' ');
    const body = [
        `M 0 ${height}`,
        `C ${0.25 * width} ${0.55 * height} ${0.25 * width} ${0.3 * height} ${0.12 * width} 0`,
        `H ${0.88 * width}`,
        `C ${0.75 * width} ${0.3 * height} ${0.75 * width} ${0.55 * height} ${width} ${height}`,
        'Z',
    ].join(' ');
    return (
        <>
            {/* The steam thins out as it rises. */}
            <defs>
                <linearGradient id={steamId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--shape-plume)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--shape-plume)" stopOpacity={1} />
                </linearGradient>
            </defs>
            <path d={wisp} fill="#fff" fillOpacity={0.7} stroke="#d3dbe1" strokeOpacity={0.7} strokeWidth={1} />
            {/* It rises from inside the tower (its bottom behind the body), growing out of the top. */}
            <path
                className="scada-plume"
                style={{ transformOrigin: `${width / 2}px 10px` }}
                d={plume}
                fill={`url(#${steamId})`}
                stroke="#d3dbe1"
                strokeWidth={1.5}
                strokeLinejoin="round"
            />
            <path d={plumeShade} fill="#dfe6eb" fillOpacity={0.8} />
            <path d={body} strokeWidth={3} strokeLinejoin="round" {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path d={`M ${0.08 * width} ${height - 10} H ${0.92 * width}`} stroke="#555" strokeWidth={8} strokeDasharray="8,6" />
            <rect
                x={-8}
                y={height - 4}
                width={width + 16}
                height={12}
                strokeWidth={2}
                {...surface.fill('pale')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
        </>
    );
}
