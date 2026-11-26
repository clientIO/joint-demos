interface ValvePartProps {
    readonly width: number;
    readonly height: number;
}

/** The bow tie of a valve symbol, filling the element. */
export function BowTie({ width, height }: ValvePartProps) {
    return (
        <path
            d={`M 0 0 L ${width} ${height} V 0 L 0 ${height} Z`}
            fill="var(--shape-face)"
            stroke="var(--shape-valve-stroke)"
            strokeWidth={2}
            strokeLinejoin="round"
        />
    );
}

/** The lever on top of a quarter-turn valve (a ball, a butterfly valve). */
export function Lever({ width, height }: ValvePartProps) {
    return (
        <path
            d={`M ${width / 2} ${height / 2} V -14 H ${width / 2 + 34}`}
            fill="none"
            stroke="#555"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    );
}
