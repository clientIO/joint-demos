import { Directional } from '../directional';
import { STUB_THICKNESS } from '../geometry';
import type { SymbolProps } from '../types';

/** An inline Y-strainer: the leg of the Y down to the right with the screen and its cap, the body as thick as the pipes. */
export function YStrainerDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <Directional>
                <path
                    d={`M ${0.3 * width} ${0.5 * height} H ${0.6 * width} L ${0.85 * width} ${height - 8} H ${0.55 * width} Z`}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    {...surface.fill('cylinder')}
                    {...surface.stroke('edge')}
                />
                <path
                    d={`M ${0.47 * width} ${0.55 * height} L ${0.7 * width} ${height - 12}`}
                    stroke="#333"
                    strokeWidth={2}
                    strokeDasharray="3,2"
                />
                <rect
                    x={0.52 * width}
                    y={height - 10}
                    width={0.36 * width}
                    height={10}
                    rx={2}
                    ry={2}
                    fill={surface.styled('accent', 'var(--shape-cap)')}
                    stroke="#333"
                    strokeWidth={1.5}
                />
            </Directional>
            <rect
                y={0.5 * height - STUB_THICKNESS / 2}
                width={width}
                height={STUB_THICKNESS}
                rx={6}
                ry={6}
                strokeWidth={2}
                {...surface.fill('pipe')}
                {...surface.stroke('edge')}
            />
        </>
    );
}
