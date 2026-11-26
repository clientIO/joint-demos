import { Directional } from '../directional';
import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import './rotating.css';

// The rotor: four vanes, swept back.
const ROTOR_RADIUS = 30;
const ROTOR_SWEEP = 10;
const ROTOR_RISE = (3 * ROTOR_RADIUS) / 4;
const ROTOR = [
    `M 0 0 V ${ROTOR_RADIUS} l ${-ROTOR_SWEEP} ${-ROTOR_RISE} Z`,
    `M 0 0 V ${-ROTOR_RADIUS} l ${ROTOR_SWEEP} ${ROTOR_RISE} Z`,
    `M 0 0 H ${ROTOR_RADIUS} l ${-ROTOR_RISE} ${ROTOR_SWEEP} Z`,
    `M 0 0 H ${-ROTOR_RADIUS} l ${ROTOR_RISE} ${-ROTOR_SWEEP} Z`,
].join(' ');

/** A centrifugal pump: its casing, the inlet low on the left, the outlet high on the right, the rotor. */
export function PumpDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <Directional>
                <PipeThrough width={width} height={height} surface={surface} ratio={0.3} half="right" />
            </Directional>
            <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            <Directional>
                <PipeThrough width={width} height={height} surface={surface} ratio={0.7} half="left" />
                <g className="scada-rotor" transform={`translate(${width / 2},${height / 2})`}>
                    <circle r={40} stroke="#666" strokeWidth={2} {...surface.fill('flat')} />
                    <circle r={34} fill="#777" stroke="#222" strokeWidth={1} />
                    <path className="scada-spin" d={ROTOR} stroke="#222" strokeWidth={3} fill="#bbb" />
                </g>
            </Directional>
        </>
    );
}
