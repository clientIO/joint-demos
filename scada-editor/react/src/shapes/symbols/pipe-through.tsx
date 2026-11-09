import { STUB_THICKNESS } from '../catalog';
import { METAL } from '../metal';

interface PipeThroughProps {
    readonly fill: string;
    /** The width of the element. */
    readonly width: number;
    /** The height of the element. */
    readonly height: number;
    /** Where the pipe's axis is: a part of the height (0 - 1). */
    readonly ratio?: number;
    /** Only the left or the right half of the element. */
    readonly half?: 'left' | 'right';
}

/**
 * A pipe running through the element behind its body (vanilla
 * `pipeThroughAttributes`): outlined along its length only, its ends open.
 */
export function PipeThrough({ fill, width, height, ratio = 0.5, half }: PipeThroughProps) {
    const pipeWidth = half ? width / 2 : width;
    return (
        <rect
            x={half === 'right' ? width / 2 : 0}
            y={ratio * height - STUB_THICKNESS / 2}
            width={pipeWidth}
            height={STUB_THICKNESS}
            fill={fill}
            stroke={METAL.stroke}
            strokeWidth={2}
            strokeDasharray={`${pipeWidth} ${STUB_THICKNESS}`}
        />
    );
}
