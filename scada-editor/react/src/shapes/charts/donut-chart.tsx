import { VERTICAL_SHIFT } from '../instruments/values';
import type { SymbolProps } from '../types';
import { ChartScreen } from './chart-screen';
import { legendY, sharesOf, slicePath, slicesOf } from './donut';

const LEGEND_COLOR = '#dfe6ee';

/** A donut chart: the shares of the parts of a whole, each in its color, with a legend of their shares on the right. */
export function DonutChartDrawing({ width, height, data, surface }: SymbolProps) {
    const slices = slicesOf(data.plant);
    const shares = sharesOf(slices);
    return (
        <>
            <ChartScreen width={width} height={height} surface={surface} />
            {slices.map((slice, index) => (
                <path key={index} d={slicePath(shares, index, height)} fill={slice.color || 'none'} stroke="#1e272e" strokeWidth={2} />
            ))}
            {slices.map((slice, index) => {
                const y = legendY(slices.length, index, height);
                return (
                    <g key={index}>
                        <rect x={height + 6} y={y - 5} width={10} height={10} rx={2} ry={2} fill={slice.color || 'none'} />
                        <text x={height + 22} y={y} dy={VERTICAL_SHIFT.middle} fontSize={12} fontFamily="sans-serif" fill={LEGEND_COLOR}>
                            {`${slice.label} ${Math.round(shares[index] * 100)} %`}
                        </text>
                    </g>
                );
            })}
        </>
    );
}
