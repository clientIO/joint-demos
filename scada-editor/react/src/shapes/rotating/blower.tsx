import { Directional } from '../directional';
import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import './rotating.css';

// The spokes of the impeller, around the center of the casing.
const SPOKE_LENGTH = 22;
const SPOKES = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    return `M 0 0 L ${(SPOKE_LENGTH * Math.cos(angle)).toFixed(2)} ${(SPOKE_LENGTH * Math.sin(angle)).toFixed(2)}`;
}).join(' ');

/** A centrifugal blower: the casing on its base, the air leaving through the outlet on the top. */
export function BlowerDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <path
                d={`M ${0.15 * width} ${height + 6} L ${0.3 * width} ${0.8 * height} H ${0.7 * width} L ${0.85 * width} ${height + 6} Z`}
                fill={surface.styled('accent', 'var(--shape-support)')}
                stroke="#333"
                strokeWidth={2}
                strokeLinejoin="round"
            />
            <Directional>
                <rect x={0.5 * width} y={-14} width={0.42 * width} height={0.5 * height} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            </Directional>
            <circle cx={width / 2} cy={height / 2} r={0.48 * height} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            <circle cx={width / 2} cy={height / 2} r={26} fill="#777" stroke="#222" strokeWidth={1.5} />
            <Directional>
                <g transform={`translate(${width / 2},${height / 2})`}>
                    <path className="scada-spin" d={SPOKES} stroke="#ddd" strokeWidth={2.5} strokeLinecap="round" />
                </g>
            </Directional>
        </>
    );
}
