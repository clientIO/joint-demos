import { SCREEN_COLOR, SCREEN_EDGE, VERTICAL_SHIFT } from '../instruments/values';
import type { Surface } from '../surface';
import type { PlantValues } from '../types';
import { formatScale, GRID, gridPath, PLOT_LEFT, plotArea, SCALE, scaleOf } from './plot';

const SCALE_COLOR = '#9aa5b1';

interface ChartScreenProps {
    readonly width: number;
    readonly height: number;
    readonly surface: Surface;
}

/** The body of a chart (in the color, finish and outline of the chart) and the dark screen in it. */
export function ChartScreen({ width, height, surface }: ChartScreenProps) {
    return (
        <>
            <rect width={width} height={height} rx={6} ry={6} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect x={6} y={6} width={width - 12} height={height - 12} rx={3} ry={3} fill={SCREEN_COLOR} stroke={SCREEN_EDGE} strokeWidth={1} />
        </>
    );
}

/** The lines of the grid of the plot of a line or a bar chart. */
export function PlotGrid({ width, height }: { readonly width: number; readonly height: number }) {
    return <path d={gridPath(plotArea(width, height), GRID)} stroke="#fff" strokeOpacity={0.12} />;
}

interface PlotScaleProps {
    readonly width: number;
    readonly height: number;
    readonly plant: PlantValues | undefined;
}

/** The values of the scale on the left of the plot, right-aligned to it. */
export function PlotScale({ width, height, plant }: PlotScaleProps) {
    const { min, max } = scaleOf(plant);
    const plot = plotArea(width, height);
    return SCALE.map((fraction) => (
        <text
            key={fraction}
            x={PLOT_LEFT - 6}
            y={plot.y + plot.height * (1 - fraction)}
            dy={VERTICAL_SHIFT.middle}
            textAnchor="end"
            fontSize={10}
            fontFamily="sans-serif"
            fill={SCALE_COLOR}
        >
            {formatScale(min + fraction * (max - min))}
        </text>
    ));
}
