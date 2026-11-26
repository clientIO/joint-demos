import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';

/** A hand valve: the handwheel on its stem above the round body. */
export function HandValveDrawing({ width, height, surface }: SymbolProps) {
    const [cx, cy] = [width / 2, height / 2];
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <rect
                x={cx - 5}
                y={-30}
                width={10}
                height={30}
                strokeWidth={2}
                {...surface.fill('dark')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
            <rect
                x={cx - 30}
                y={-30}
                width={60}
                height={10}
                rx={5}
                ry={5}
                stroke="#333"
                strokeWidth={2}
                fill={surface.styled('accent', 'var(--shape-valve-operator)')}
            />
            <ellipse cx={cx} cy={cy} rx={cx} ry={cy} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
        </>
    );
}
