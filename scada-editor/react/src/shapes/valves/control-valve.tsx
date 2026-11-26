import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import { openingOf } from './valve-state';
import './valves.css';

// The cover slides over the opening of its frame (the frame is 30 wide, 3 on each side).
const COVER_MAX_WIDTH = 24;

/**
 * A control valve: the actuator on its stem, the body with a window on the pipe - the more the valve is closed, the
 * wider the cover over it.
 */
export function ControlValveDrawing({ width, height, data, surface }: SymbolProps) {
    const [cx, cy] = [width / 2, height / 2];
    const windowPath = `M ${cx - 12} ${cy} h 24`;
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
            <path
                d="M 0 0 C 0 -30 60 -30 60 0 Z"
                transform={`translate(${cx - 30}, -20)`}
                stroke="#333"
                strokeWidth={2}
                fill={surface.styled('accent', 'var(--shape-valve-operator)')}
            />
            <ellipse cx={cx} cy={cy} rx={cx} ry={cy} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            <rect x={cx - 15} y={cy - 15} width={30} height={30} rx={1} ry={1} stroke="#777" strokeWidth={2} fill="none" />
            {/* The pipe seen through the window: as tall as the pipes, with their outline */}
            <path d={windowPath} stroke="#444" strokeWidth={16} />
            <path d={windowPath} stroke="var(--shape-pipe)" strokeWidth={10} />
            {/* The dashes of the flowing liquid: hidden, shown by the run-mode animation */}
            <path
                className="scada-flow"
                d={windowPath}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0}
                strokeWidth={3}
                strokeDasharray="6 18"
                strokeLinecap="round"
            />
            <rect
                x={cx - 12}
                y={cy - 12}
                width={Math.round(COVER_MAX_WIDTH * (1 - openingOf(data)))}
                height={24}
                stroke="#333"
                strokeWidth={2}
                fill="var(--shape-valve-cover)"
            />
        </>
    );
}
