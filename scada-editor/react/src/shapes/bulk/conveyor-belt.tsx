import type { SymbolProps } from '../types';
import './bulk.css';
import { BOX_POSITIONS, BOX_WIDTH, ridesOf } from './ride';

/** A belt conveyor on legs carrying boxes from the left to the right: the rollers in the belt, the ends rounded. */
export function ConveyorBeltDrawing({ width, height, surface }: SymbolProps) {
    // The rollers are as big as the belt is tall (its shorter side).
    const side = Math.min(width, height);
    const rollers = [side / 2, width / 2, width - side / 2];
    const rides = ridesOf(width, height);
    return (
        <>
            <path
                d={`M ${0.15 * width} ${height / 2} V ${height + 16} M ${0.85 * width} ${height / 2} V ${height + 16}`}
                stroke="var(--shape-legs)"
                strokeWidth={6}
                strokeLinecap="round"
            />
            <rect width={width} height={height} rx={side / 2} ry={side / 2} fill="#444" stroke="#222" strokeWidth={2} />
            {rollers.map((cx, index) => (
                <circle key={index} cx={cx} cy={height / 2} r={side / 2 - 4} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            ))}
            {BOX_POSITIONS.map((position, index) => (
                <rect
                    key={position}
                    className={rides[index] ? 'scada-ride' : undefined}
                    style={rides[index]}
                    x={position * width}
                    y={-22}
                    width={BOX_WIDTH}
                    height={22}
                    fill="#c9a26b"
                    stroke="#7a5a32"
                    strokeWidth={1.5}
                />
            ))}
        </>
    );
}
