import type { SymbolProps } from '../catalog';
import { METAL, useSvgId } from '../metal';
import './electrical.css';

/*
 * The electrical equipment, as the TypeScript SCADA editor draws it (see
 * `ts/src/shapes/models/electrical/`): the vanilla `calc()` geometry evaluated
 * in each element's default box. The terminals and the label are the parent's.
 */

const GENERATOR_RIBS_X = [26.4, 38.4, 50.4, 62.4, 74.4, 86.4];
const GENERATOR_RIBS = GENERATOR_RIBS_X.map(x => `M ${x} 19.2 V 65.6`).join(' ');
const GENERATOR_FEET = 'M 24 68 V 80 M 84 68 V 80 M 12 80 H 36 M 72 80 H 96';

const TRANSFORMER_FINS_Y = [20, 35, 50, 65, 80];
const TRANSFORMER_FINS = TRANSFORMER_FINS_Y.map(y => `M 0 ${y} H 9.6 M 70.4 ${y} H 80`).join(' ');
/** The centers of the bushings on the lid: the high-voltage side, then the low-voltage one. */
const TRANSFORMER_BUSHINGS_X = [24, 56];
const TRANSFORMER_SHEDS = TRANSFORMER_BUSHINGS_X.map(x => `M ${x - 8} -16 H ${x + 8} M ${x - 8} -8 H ${x + 8}`).join(' ');

/** A horizontal alternator on its feet: a ribbed stator, the end bell, the shaft and the terminal box on top. */
export function GeneratorSymbol({ metal }: SymbolProps) {
    return (
        <>
            <path className="electrical-generator-feet" d={GENERATOR_FEET} />
            <rect x={12} y={16} width={84} height={52.8} rx={6} fill={metal.pipe} stroke={METAL.stroke} strokeWidth={2} />
            <path d={GENERATOR_RIBS} stroke={METAL.stroke} strokeOpacity={0.55} strokeWidth={2} />
            <rect x={96} y={22.4} width={12} height={40} rx={4} fill={metal.pipe} stroke={METAL.stroke} strokeWidth={2} />
            <rect x={0} y={37.6} width={12} height={9.6} fill={metal.pipe} stroke={METAL.stroke} strokeWidth={1.5} />
            <rect className="electrical-generator-key" x={4} y={37.6} width={4} height={2} />
            <rect className="electrical-generator-key electrical-generator-key-late" x={4} y={37.6} width={4} height={2} />
            <rect x={45} y={0} width={30} height={17.6} rx={2} fill={metal.plate} stroke={METAL.stroke} strokeWidth={1.5} />
        </>
    );
}

/** A distribution transformer: a round finned tank, the porcelain bushings of its two sides on the lid. */
export function TransformerSymbol({ metal }: SymbolProps) {
    const porcelainId = useSvgId('porcelain');
    return (
        <>
            <defs>
                <linearGradient id={porcelainId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--shape-porcelain-1)" />
                    <stop offset="35%" stopColor="var(--shape-porcelain-2)" />
                    <stop offset="100%" stopColor="var(--shape-porcelain-3)" />
                </linearGradient>
            </defs>
            {TRANSFORMER_BUSHINGS_X.map(x => (
                <rect key={x} className="electrical-transformer-bushing" x={x - 6} y={-22} width={12} height={24} rx={3} fill={`url(#${porcelainId})`} />
            ))}
            <path className="electrical-transformer-sheds" d={TRANSFORMER_SHEDS} />
            <path d={TRANSFORMER_FINS} stroke={METAL.stroke} strokeWidth={4} strokeLinecap="round" />
            <path className="electrical-transformer-hum" d={TRANSFORMER_FINS} />
            <rect x={8} y={4} width={64} height={96} rx={8} ry={6} fill={metal.cylinder} stroke={METAL.stroke} strokeWidth={2} />
            <path className="electrical-transformer-flux" d="M 24 22 V 88 M 56 22 V 88" />
            <rect x={6.4} y={0} width={67.2} height={8} rx={3} fill={metal.cylinder} stroke={METAL.stroke} strokeWidth={2} />
        </>
    );
}

/** A molded-case circuit breaker: the lever up and ON in red while closed, down and OFF in green while open. */
export function BreakerSymbol({ metal }: SymbolProps) {
    return (
        <>
            <rect x={0} y={0} width={60} height={80} rx={4} fill={metal.plate} stroke={METAL.stroke} strokeWidth={2} />
            <rect className="electrical-breaker-front" x={9} y={9.6} width={42} height={60.8} rx={3} />
            <rect className="electrical-breaker-slot" x={25} y={16} width={10} height={28.8} rx={3} />
            <rect className="electrical-breaker-lever" x={22} y={16} width={16} height={12.8} rx={3} />
            <g className="electrical-breaker-closed">
                <rect className="electrical-breaker-window" x={15} y={51.2} width={30} height={12.8} rx={2} />
                <text className="electrical-breaker-state" x={30} y={57.6}>ON</text>
            </g>
            <g className="electrical-breaker-open">
                <rect className="electrical-breaker-window" x={15} y={51.2} width={30} height={12.8} rx={2} />
                <text className="electrical-breaker-state" x={30} y={57.6}>OFF</text>
            </g>
        </>
    );
}
