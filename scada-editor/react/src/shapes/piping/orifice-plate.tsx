import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';

interface FlangeProps {
    readonly x: number;
    readonly height: number;
}

/** A flange holding the plate: on each side of it. */
function Flange({ x, height }: FlangeProps) {
    return <rect x={x} width={8} height={height} rx={2} ry={2} fill="#9aa3ab" stroke="#555" strokeWidth={1.5} />;
}

/** An orifice plate: the plate (its tab sticking out on the top) between two flanges, the pipe through them. */
export function OrificePlateDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <rect
                x={width / 2 - 3}
                y={-14}
                width={6}
                height={16}
                strokeWidth={1}
                {...surface.fill('dark')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
            <Flange x={width / 2 - 11} height={height} />
            <Flange x={width / 2 + 3} height={height} />
            <rect x={width / 2 - 3} width={6} height={height} {...surface.fill('dark')} />
        </>
    );
}
