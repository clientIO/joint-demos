import { Directional } from '../directional';
import type { SymbolProps } from '../types';
import './bulk.css';

/** The pattern of the buckets on the chain: their height along it and the gap after each (see `bulk.css`). */
const BUCKET_PATTERN = '10 14';

/**
 * A bucket elevator: the buckets on a chain (going up while it runs) lift the material fed in at the boot (bottom
 * left) to the head, it pours out of the discharge chute (top right).
 */
export function BucketElevatorDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <rect x={0.2 * width} y={30} width={0.6 * width} height={height - 60} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect x={0.32 * width} y={36} width={0.36 * width} height={height - 72} fill="#2b2f33" />
            {/* Drawn from the boot to the head: the dashes go up. */}
            <path
                className="scada-buckets"
                d={`M ${0.5 * width} ${height - 38} V 38`}
                stroke={surface.styled('accent', 'var(--shape-bucket)')}
                strokeWidth={24}
                strokeDasharray={BUCKET_PATTERN}
            />
            <Directional>
                <path
                    d={`M ${0.9 * width} 8 L ${width + 30} 34 V 50 L ${0.9 * width} 30 Z`}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    {...surface.fill('plate')}
                    {...surface.stroke('edge')}
                />
            </Directional>
            <rect x={0.1 * width} width={0.8 * width} height={36} rx={0.4 * width} ry={18} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <circle cx={0.5 * width} cy={18} r={0.18 * width} strokeWidth={1.5} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            <Directional>
                <path
                    d={`M ${0.1 * width} ${height - 34} L -30 ${height - 58} V ${height - 42} L ${0.1 * width} ${height - 16} Z`}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    {...surface.fill('plate')}
                    {...surface.stroke('edge')}
                />
            </Directional>
            <rect x={0.1 * width} y={height - 36} width={0.8 * width} height={36} rx={4} ry={4} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <circle cx={0.5 * width} cy={height - 18} r={0.18 * width} strokeWidth={1.5} {...surface.fill('sphere')} {...surface.stroke('edge')} />
        </>
    );
}
