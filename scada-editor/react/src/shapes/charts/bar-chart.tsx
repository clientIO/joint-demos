import { LIQUID_COLOR } from '../instruments/values';
import type { Rect } from '../geometry';
import type { SymbolProps } from '../types';
import { ChartScreen, PlotGrid, PlotScale } from './chart-screen';
import { chartValues, plotArea, plotY, scaleOf, type Scale } from './plot';

// The bar takes this part of its slot of the plot
const BAR_WIDTH = 0.6;

/** The bars of the values on the scale side by side across the plot, as one path. */
function barsPath(values: readonly number[], scale: Scale, plot: Rect): string {
    if (values.length === 0) {
        return 'M 0 0';
    }
    const slot = plot.width / values.length;
    const width = slot * BAR_WIDTH;
    const bottom = plot.y + plot.height;
    return values
        .map((value, index) => {
            const x = plot.x + slot * index + (slot - width) / 2;
            return `M ${x} ${bottom} V ${plotY(plot, value, scale)} H ${x + width} V ${bottom} Z`;
        })
        .join(' ');
}

/** A bar chart: a value of each of the recent periods, the newest on the right. */
export function BarChartDrawing({ width, height, data, surface }: SymbolProps) {
    return (
        <>
            <ChartScreen width={width} height={height} surface={surface} />
            <PlotGrid width={width} height={height} />
            <path d={barsPath(chartValues(data.plant), scaleOf(data.plant), plotArea(width, height))} fill={surface.styled('accent', LIQUID_COLOR)} fillOpacity={0.85} />
            <PlotScale width={width} height={height} plant={data.plant} />
        </>
    );
}
