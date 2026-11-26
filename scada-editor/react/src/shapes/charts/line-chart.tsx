import { LIQUID_COLOR, MAX_LIQUID_COLOR, MIN_LIQUID_COLOR, thresholdsOf } from '../instruments/values';
import type { Rect } from '../geometry';
import type { SymbolProps } from '../types';
import { ChartScreen, PlotGrid, PlotScale } from './chart-screen';
import { chartValues, plotArea, plotY, scaleOf, type Scale } from './plot';

const MARK = { fill: 'none', strokeWidth: 1.5, strokeDasharray: '4 3' } as const;

/** The line (or the area under it) through the values on the scale, across the plot. */
function seriesPath(values: readonly number[], scale: Scale, plot: Rect, isClosed: boolean): string {
    if (values.length === 0) {
        return 'M 0 0';
    }
    const last = Math.max(1, values.length - 1);
    const points = values.map((value, index) => `${plot.x + (plot.width * index) / last} ${plotY(plot, value, scale)}`);
    const line = `M ${points.join(' L ')}`;
    return isClosed ? `${line} V ${plot.y + plot.height} H ${plot.x} Z` : line;
}

/** A dashed line across the plot at a threshold; none without it. */
function levelPath(plot: Rect, value: number | undefined, scale: Scale): string {
    if (value === undefined) {
        return 'M 0 0';
    }
    const y = plotY(plot, value, scale);
    return `M ${plot.x} ${y} H ${plot.x + plot.width}`;
}

/** A line chart: the recent history of a value (the newest on the right) with the warning thresholds dashed across. */
export function LineChartDrawing({ width, height, data, surface }: SymbolProps) {
    const plot = plotArea(width, height);
    const scale = scaleOf(data.plant);
    const values = chartValues(data.plant);
    const { low, high } = thresholdsOf(data.plant?.thresholds, {});
    // The lower one of the two is the low one; one of them only - where it is
    const isBoth = low !== undefined && high !== undefined;
    const accent = surface.styled('accent', LIQUID_COLOR);
    return (
        <>
            <ChartScreen width={width} height={height} surface={surface} />
            <PlotGrid width={width} height={height} />
            <path d={seriesPath(values, scale, plot, true)} fill={accent} fillOpacity={0.2} />
            <path d={seriesPath(values, scale, plot, false)} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />
            <path d={levelPath(plot, isBoth ? Math.max(low, high) : high, scale)} {...MARK} stroke={MAX_LIQUID_COLOR} />
            <path d={levelPath(plot, isBoth ? Math.min(low, high) : low, scale)} {...MARK} stroke={MIN_LIQUID_COLOR} />
            <PlotScale width={width} height={height} plant={data.plant} />
        </>
    );
}
