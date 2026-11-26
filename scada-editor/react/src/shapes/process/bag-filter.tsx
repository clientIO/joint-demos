import type { SymbolProps } from '../types';
import './process.css';

// Where the filter bags hang across the housing (parts of the width).
const BAGS = [0.2, 0.4, 0.6, 0.8];
// The pulses of air cleaning the bags go from one bag to the next this far apart (s).
const PULSE_STAGGER = 1;

/**
 * A bag filter (a baghouse): the dusty gas in on the left, the dust kept on the bags falls into the hopper, the
 * clean gas leaves the plenum on the top right.
 */
export function BagFilterDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={`M ${0.06 * width} ${0.6 * height} V ${height} M ${0.94 * width} ${0.6 * height} V ${height}`}
                stroke={surface.styled('accent', 'var(--shape-legs)')}
                strokeWidth={6}
                strokeLinecap="round"
            />
            <path
                d={`M 0 ${0.6 * height} H ${width} L ${0.6 * width} ${0.88 * height} H ${0.4 * width} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('cone')}
                {...surface.stroke('edge')}
            />
            {/* The rotary valve the dust leaves the hopper through. */}
            <rect
                x={0.4 * width}
                y={0.88 * height}
                width={0.2 * width}
                height={0.08 * height}
                rx={2}
                ry={2}
                strokeWidth={1.5}
                {...surface.fill('dark')}
                {...surface.stroke('edge')}
            />
            <rect y={0.1 * height} width={width} height={0.5 * height} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect x={0.08 * width} y={0.14 * height} width={0.84 * width} height={0.42 * height} fill="#2b2f33" />
            {BAGS.map((x, index) => (
                <rect
                    key={x}
                    className="scada-bag"
                    style={{ animationDelay: `${index * PULSE_STAGGER}s` }}
                    x={x * width - 9}
                    y={0.17 * height}
                    width={18}
                    height={0.36 * height}
                    rx={8}
                    ry={8}
                    fill="var(--shape-filter-bag)"
                    stroke="#8a8270"
                    strokeWidth={1}
                />
            ))}
            {/* The clean gas plenum on the top. */}
            <rect width={width} height={0.1 * height} strokeWidth={2} {...surface.fill('mid')} {...surface.stroke('edge')} />
        </>
    );
}
