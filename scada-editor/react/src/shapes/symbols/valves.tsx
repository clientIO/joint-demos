import type { SymbolProps } from '../catalog';
import { METAL, useSvgId } from '../metal';
import { PipeThrough } from './pipe-through';
import './valves.css';

/*
 * The valves, as the TypeScript SCADA editor draws them (see
 * `ts/src/shapes/models/valves/`): the vanilla `calc()` geometry evaluated in
 * each element's default box. The pipe stubs, the flanges and the label are
 * the parent's; the pipe running through behind the body is drawn here.
 * Open or closed is `data-active` on the parent `.equipment` (see `valves.css`).
 */

const VALVE_SIZE = 60;
const CHECK_VALVE_HEIGHT = 40;
const CENTER = VALVE_SIZE / 2;

/** The x of the handwheel's spokes, seen edge-on (they slide as the wheel turns). */
const HANDWHEEL_SPOKES_X = [-5, 5, 15, 25, 35, 45, 55, 65];
const HANDWHEEL_SPOKES = HANDWHEEL_SPOKES_X.map(x => `M ${x} -28 V -22`).join(' ');

/** The diaphragm actuator of a control valve: a dome on top of the stem. */
const ACTUATOR_DOME = 'M 0 0 C 0 -30 60 -30 60 0 Z';
/** The window of a control valve: the frame is 30 wide, the cover slides over its 24 wide opening. */
const WINDOW_OPENING = 24;
const WINDOW_LEFT = CENTER - WINDOW_OPENING / 2;
/** The dashes of the liquid seen through the window, longer than it by one dash period on each side. */
const FLOW_DASHES = `M ${WINDOW_LEFT - 24} ${CENTER} H ${WINDOW_LEFT + WINDOW_OPENING + 24}`;

const CHECK_VALVE_BODY = `M 0 0 L ${VALVE_SIZE} ${CHECK_VALVE_HEIGHT} V 0 L 0 ${CHECK_VALVE_HEIGHT} Z`;
const CHECK_VALVE_INLET = `M 0 0 L ${CENTER} ${CHECK_VALVE_HEIGHT / 2} L 0 ${CHECK_VALVE_HEIGHT} Z`;
const CHECK_VALVE_ARROW = 'M 12 -10 H 48 m -6 -4 l 6 4 l -6 4';

/** The stem of an operator, from above the body down into it, with a collar showing its travel. */
function Stem() {
    return (
        <>
            <rect x={CENTER - 5} y={-30} width={10} height={30} fill={METAL.dark} stroke={METAL.darkEdge} strokeWidth={2} />
            <rect className="valves-collar" x={CENTER - 7} y={-13} width={14} height={4} rx={1} />
        </>
    );
}

/** The valve body: a shaded sphere filling the element. */
function SphereBody({ fill }: { readonly fill: string }) {
    return <ellipse cx={CENTER} cy={CENTER} rx={CENTER} ry={CENTER} fill={fill} stroke={METAL.stroke} strokeWidth={2} />;
}

/** A hand-operated valve: the handwheel on its stem turns and lowers it, closing the gate in the body. */
export function HandValveSymbol({ metal }: SymbolProps) {
    const wheelClipId = useSvgId('valvesWheel');
    return (
        <>
            <clipPath id={wheelClipId}>
                <rect x={0} y={-30} width={VALVE_SIZE} height={10} rx={5} />
            </clipPath>
            <PipeThrough fill={metal.pipe} width={VALVE_SIZE} height={VALVE_SIZE} />
            <g className="valves-hand-operator">
                <Stem />
                <rect x={0} y={-30} width={VALVE_SIZE} height={10} rx={5} fill="var(--shape-valve-operator)" />
                <g clipPath={`url(#${wheelClipId})`}>
                    <path className="valves-hand-spokes" d={HANDWHEEL_SPOKES} />
                </g>
                <rect className="valves-outline" x={0} y={-30} width={VALVE_SIZE} height={10} rx={5} />
            </g>
            <SphereBody fill={metal.sphere} />
            <rect className="valves-hand-gate" x={CENTER - 3} y={CENTER - 14} width={6} height={28} rx={1} />
        </>
    );
}

/** A control valve: the actuator drives its stem, the cover slides over the window as the valve closes. */
export function ControlValveSymbol({ metal }: SymbolProps) {
    const windowClipId = useSvgId('valvesWindow');
    return (
        <>
            <clipPath id={windowClipId}>
                <rect x={WINDOW_LEFT} y={CENTER - 5} width={WINDOW_OPENING} height={10} />
            </clipPath>
            <PipeThrough fill={metal.pipe} width={VALVE_SIZE} height={VALVE_SIZE} />
            <g className="valves-control-stem">
                <Stem />
            </g>
            <path
                d={ACTUATOR_DOME}
                transform={`translate(${CENTER - 30} -20)`}
                fill="var(--shape-valve-operator)"
                className="valves-outline"
            />
            <SphereBody fill={metal.sphere} />
            <rect className="valves-control-frame" x={CENTER - 15} y={CENTER - 15} width={30} height={30} rx={1} />
            <path className="valves-control-liquid-outline" d={`M ${WINDOW_LEFT} ${CENTER} h ${WINDOW_OPENING}`} />
            <path className="valves-control-liquid" d={`M ${WINDOW_LEFT} ${CENTER} h ${WINDOW_OPENING}`} />
            <g clipPath={`url(#${windowClipId})`}>
                <path className="valves-control-flow" d={FLOW_DASHES} />
            </g>
            <rect
                className="valves-control-cover valves-outline"
                x={WINDOW_LEFT}
                y={CENTER - 12}
                width={WINDOW_OPENING}
                height={WINDOW_OPENING}
                fill="var(--shape-valve-cover)"
            />
        </>
    );
}

/** A check valve: the bow tie with its inlet half filled; the arrow nudges forward while flow passes. */
export function CheckValveSymbol({ metal }: SymbolProps) {
    return (
        <>
            <PipeThrough fill={metal.pipe} width={VALVE_SIZE} height={CHECK_VALVE_HEIGHT} />
            <path className="valves-check-body" d={CHECK_VALVE_BODY} />
            <path className="valves-check-inlet" d={CHECK_VALVE_INLET} />
            <path className="valves-check-arrow" d={CHECK_VALVE_ARROW} />
        </>
    );
}
