import type { SymbolProps } from '../types';
import './rotating.css';

// The cooling fins across the housing (parts of the width).
const FINS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
// The fins stop short of the top and the bottom of the housing.
const FIN_INSET = 6;

/** An electric motor: a finned housing on feet, the shaft on the right, the terminal box on the top. */
export function MotorDrawing({ width, height, surface }: SymbolProps) {
    const foot = (x: number) => `M ${x * width} ${height} h ${0.25 * width} l 4 8 h ${-0.25 * width - 8} Z`;
    const fins = FINS.map((x) => `M ${x * width} ${FIN_INSET} V ${height - FIN_INSET}`).join(' ');
    return (
        <>
            <path d={`${foot(0.1)} ${foot(0.65)}`} strokeWidth={1.5} {...surface.fill('dark')} {...surface.stroke('var(--shape-metal-dark-edge)')} />
            <rect x={width - 2} y={height / 2 - 5} width={22} height={10} strokeWidth={1.5} {...surface.fill('pale')} {...surface.stroke('var(--shape-metal-dark-edge)')} />
            {/* A key on the shaft: swept across it while the motor runs, hidden otherwise. */}
            <rect className="scada-shaft-mark" x={width + 6} y={height / 2 - 5} width={4} height={2} fill="#333" opacity={0} />
            <rect x={-8} y={8} width={12} height={height - 16} rx={3} ry={3} strokeWidth={1.5} {...surface.fill('mid')} {...surface.stroke('var(--shape-metal-dark-edge)')} />
            <rect width={width} height={height} rx={8} ry={8} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <path d={fins} strokeOpacity={0.6} strokeWidth={2} {...surface.stroke('edge')} />
            <rect
                x={0.35 * width}
                y={-12}
                width={0.3 * width}
                height={14}
                rx={2}
                ry={2}
                fill={surface.styled('accent', 'var(--shape-terminal-box)')}
                stroke="#333"
                strokeWidth={1.5}
            />
        </>
    );
}
