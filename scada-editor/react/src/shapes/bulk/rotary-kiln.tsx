import { Directional } from '../directional';
import type { SymbolProps } from '../types';
import './bulk.css';

// The shell of the kiln: its top and its height (parts of the height).
const SHELL_Y = 0.12;
const SHELL_HEIGHT = 0.5;
// The riding rings around the shell, each carried by a pier (parts of the width).
const TYRES = [0.27, 0.67];

/** A pier under a riding ring at `x`. */
const pier = (x: number, height: number) => `M ${x - 18} ${height} L ${x - 10} ${0.68 * height} H ${x + 10} L ${x + 18} ${height} Z`;

/**
 * A rotary kiln: a long drum on its riding rings, the material fed in at the inlet (left) and burnt by the flame of
 * the burner in the hood (right); while it runs the flame burns and the hot zone glows.
 */
export function RotaryKilnDrawing({ width, height, surface }: SymbolProps) {
    const shellY = SHELL_Y * height;
    const shellHeight = SHELL_HEIGHT * height;
    const shellMiddle = (SHELL_Y + SHELL_HEIGHT / 2) * height;
    const flameBase = 0.9 * width;
    return (
        <Directional>
            <path
                d={TYRES.map((at) => pier(at * width, height)).join(' ')}
                fill={surface.styled('accent', 'var(--shape-support)')}
                stroke="#333"
                strokeWidth={2}
                strokeLinejoin="round"
            />
            <rect x={0.06 * width} y={shellY} width={0.84 * width} height={shellHeight} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            {/* The burning zone near the hood, hot through the shell. */}
            <rect
                className="scada-hot-zone"
                x={0.62 * width}
                y={shellY + 2}
                width={0.28 * width}
                height={shellHeight - 4}
                fill="var(--shape-flame)"
                fillOpacity={0.3}
                pointerEvents="none"
            />
            {TYRES.map((at) => (
                <rect
                    key={at}
                    x={at * width - 7}
                    y={(SHELL_Y - 0.06) * height}
                    width={14}
                    height={(SHELL_HEIGHT + 0.12) * height}
                    rx={3}
                    ry={3}
                    strokeWidth={1.5}
                    {...surface.fill('mid')}
                    {...surface.stroke('edge')}
                />
            ))}
            {/* The girth gear the drive turns the kiln by. */}
            <rect
                x={0.47 * width - 6}
                y={(SHELL_Y - 0.08) * height}
                width={12}
                height={(SHELL_HEIGHT + 0.16) * height}
                rx={2}
                ry={2}
                strokeWidth={1.5}
                {...surface.fill('dark')}
                {...surface.stroke('edge')}
            />
            <rect y={0} width={0.08 * width} height={0.74 * height} rx={3} ry={3} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect x={0.88 * width} y={0} width={0.12 * width} height={0.86 * height} rx={3} ry={3} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            {/* On the grid at the default size: its tip and its axis. */}
            <rect x={width} y={0.4 * height - 5} width={20} height={10} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <path
                className="scada-flame-outer"
                d={`M ${flameBase} ${(SHELL_Y + 0.08) * height} Q ${0.7 * width} ${shellMiddle} ${flameBase} ${(SHELL_Y + SHELL_HEIGHT - 0.08) * height} Z`}
                fill="var(--shape-flame)"
                pointerEvents="none"
            />
            <path
                className="scada-flame-inner"
                d={`M ${flameBase} ${(SHELL_Y + 0.15) * height} Q ${0.78 * width} ${shellMiddle} ${flameBase} ${(SHELL_Y + SHELL_HEIGHT - 0.15) * height} Z`}
                fill="color-mix(in oklab, var(--shape-flame) 60%, #b91c1c)"
                pointerEvents="none"
            />
        </Directional>
    );
}
