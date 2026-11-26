import { Directional } from '../directional';
import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import './rotating.css';

/** A compressor: the casing on its base, the ISA symbol narrowing in the direction of the flow, the rotor ring. */
export function CompressorDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <Directional>
                <path
                    d={`M ${0.15 * width} ${height} L ${0.3 * width} ${0.8 * height} H ${0.7 * width} L ${0.85 * width} ${height} Z`}
                    fill={surface.styled('accent', 'var(--shape-support)')}
                    stroke="#333"
                    strokeWidth={2}
                    strokeLinejoin="round"
                />
                <circle cx={width / 2} cy={height / 2} r={0.45 * width} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
                {/* Drawn around the center (moved there) so it turns in place; hidden until it runs. */}
                <g transform={`translate(${width / 2},${height / 2})`}>
                    <circle
                        className="scada-compressor-rotor"
                        r={0.38 * width}
                        fill="none"
                        stroke="#333"
                        strokeWidth={2}
                        strokeDasharray="4 6"
                        strokeOpacity={0}
                    />
                </g>
                <path
                    d={`M ${0.22 * width} ${0.22 * height} L ${0.78 * width} ${0.36 * height} V ${0.64 * height} L ${0.22 * width} ${0.78 * height} Z`}
                    fill="#777"
                    stroke="#222"
                    strokeWidth={2}
                    strokeLinejoin="round"
                />
            </Directional>
        </>
    );
}
