import { Directional } from '../directional';
import type { SymbolProps } from '../types';

/** A cyclone separator: the gas in tangentially on the top left, the dust down the cone, the clean gas out of the top. */
export function CycloneDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <Directional>
                <rect x={-24} y={8} width={30} height={20} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            </Directional>
            <rect x={0.3 * width} y={-18} width={0.4 * width} height={22} strokeWidth={2} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path
                d={`M 0 ${0.4 * height} H ${width} L ${0.6 * width} ${height - 10} H ${0.4 * width} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('cone')}
                {...surface.stroke('edge')}
            />
            <rect width={width} height={0.4 * height} strokeWidth={2} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <rect
                x={0.4 * width}
                y={height - 12}
                width={0.2 * width}
                height={12}
                strokeWidth={1.5}
                {...surface.fill('mid')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
        </>
    );
}
