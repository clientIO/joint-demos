import { useId } from 'react';
import type { SymbolProps } from '../types';
import { liquidColor, PANEL_THRESHOLDS, PANEL_VALUES, panelTicks, SCREEN_INSET, SIDE_GAP, thresholdMarker, TRACK_LEFT, TRACK_WIDTH, WINDOW_TOP, windowHeight, windowY } from './level-panel-layout';
import { MAX_LIQUID_COLOR, MIN_LIQUID_COLOR, percentOf, percentThresholds, SCREEN_COLOR, SCREEN_EDGE, VERTICAL_SHIFT } from './values';
import './instruments.css';

const SCREEN_TEXT = '#e6edf3';
const SCREEN_MUTED = '#8b98a5';
const TRACK_COLOR = '#2b3640';

/**
 * A level gauge (the Level Panel): on a screen as the charts, the level as a number above a rounded track with the
 * liquid in it (in the warning colors below and above the thresholds), the thresholds as arrows beside it.
 */
export function PanelDrawing({ width, height, data, surface }: SymbolProps) {
    const shineId = `panel-shine${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const level = percentOf(data.plant?.level);
    const thresholds = percentThresholds(data.plant?.thresholds, PANEL_THRESHOLDS);
    const ratio = level / 100;
    const track = { x: TRACK_LEFT, y: WINDOW_TOP, width: TRACK_WIDTH * width, height: windowHeight(height, 1), rx: (TRACK_WIDTH / 2) * width, ry: (TRACK_WIDTH / 2) * width };
    const isShaded = surface.finish !== 'flat';
    return (
        <>
            {isShaded && (
                <defs>
                    <linearGradient id={shineId}>
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
                        <stop offset="30%" stopColor="#ffffff" stopOpacity={0.22} />
                        <stop offset="55%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                </defs>
            )}
            <rect width={width} height={height} rx={10} ry={10} strokeWidth={1.5} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect x={SCREEN_INSET} y={SCREEN_INSET} width={width - 2 * SCREEN_INSET} height={height - 2 * SCREEN_INSET} rx={6} ry={6} fill={SCREEN_COLOR} stroke={SCREEN_EDGE} strokeWidth={1} />
            <text x={0.5 * width} y={30} dy={VERTICAL_SHIFT.middle} textAnchor="middle" fontSize={20} fontWeight={600} fontFamily="ui-monospace, Menlo, monospace" fill={SCREEN_TEXT}>
                {`${Math.round(level)} %`}
            </text>
            <rect {...track} fill={TRACK_COLOR} />
            <rect
                className="scada-level"
                x={TRACK_LEFT}
                y={windowY(height, 1 - ratio)}
                width={TRACK_WIDTH * width}
                height={windowHeight(height, ratio)}
                rx={(TRACK_WIDTH / 2) * width}
                ry={(TRACK_WIDTH / 2) * width}
                fill={liquidColor(level, thresholds, data.style?.accent)}
            />
            <rect {...track} fill={isShaded ? `url(#${shineId})` : 'none'} pointerEvents="none" />
            <path d={panelTicks(width, height)} fill="none" stroke={SCREEN_MUTED} strokeWidth={1.2} strokeLinecap="round" />
            {PANEL_VALUES.map(({ text, ratio: at }) => (
                <text key={text} x={width - (SCREEN_INSET + SIDE_GAP)} y={windowY(height, at)} dy={VERTICAL_SHIFT.middle} textAnchor="end" fontSize={11} fontFamily="sans-serif" fill={SCREEN_MUTED}>
                    {text}
                </text>
            ))}
            <path d={thresholdMarker(height, thresholds.low)} fill={MIN_LIQUID_COLOR} />
            <path d={thresholdMarker(height, thresholds.high)} fill={MAX_LIQUID_COLOR} />
        </>
    );
}
