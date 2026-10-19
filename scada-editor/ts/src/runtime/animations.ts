import type { dia } from '@joint/plus';
import { BOX_POSITIONS, BOX_WIDTH } from '../shapes/models/bulk/ConveyorBelt';
import { CLEAT_PATTERN } from '../shapes/models/bulk/Conveyor';
import { JAW_PIVOT } from '../shapes/models/bulk/Crusher';
import { LINER_PATTERN } from '../shapes/models/bulk/Mill';
import { BUCKET_PATTERN } from '../shapes/models/bulk/BucketElevator';
import { BAGS } from '../shapes/models/process/BagFilter';
import { dataOf, hasData } from '../shapes/common/data';
import { setGliding } from '../shapes/views/glide';

/*
 * The animations of the runtime mode (the Web Animations API on the views of the cells):
 * the rotors spin, the agitators stir and the conveyors carry while the power is on, the liquid flows through the
 * pipes and the open valves,
 * the flames flicker, the smoke rises, the liquid in a level gauge rises and falls to its new level.
 * Nothing is animated while the diagram is edited; in the run mode, what moves is the level of the diagram
 * (see `AnimationLevel`): all of it, or the alarms only.
 *
 * An animation doesn't change the model: when it is cancelled, the view is as it was.
 */

type Animator = (cellView: dia.CellView) => Animation[];

/**
 * What an animation shows: the equipment running (rotors, agitators, flames, smoke, ...), the liquid flowing,
 * an alarm, a level moving to its new value.
 */
export type AnimationKind = 'equipment' | 'flow' | 'alarm' | 'level';

/**
 * How much of the plant moves (a setting of the diagram, see `settings.ts`): all of it, or the alarms only - the
 * high-performance HMI style (ISA-101): the steady plant still, the motion left for what needs attention
 * (a level glides to its new value: a change, not a constant motion).
 */
export type AnimationLevel = 'full' | 'alarms';

const LEVEL_KINDS: Record<AnimationLevel, Set<AnimationKind>> = {
    full: new Set(['equipment', 'flow', 'alarm', 'level']),
    alarms: new Set(['alarm', 'level'])
};

/** The attribute of the graph with the animation level (saved with the diagram) */
export const ANIMATIONS_ATTRIBUTE = 'animations';

/** The animation level of the diagram (all of it by default) */
export function getAnimationLevel(graph: dia.Graph): AnimationLevel {
    return graph.get(ANIMATIONS_ATTRIBUTE) === 'alarms' ? 'alarms' : 'full';
}

const LOOP: KeyframeAnimationOptions = { iterations: Infinity };

/** A node of the view by its selector (an SVG one). */
function node(cellView: dia.CellView, selector: string): SVGElement | null {
    const found = cellView.findNode(selector);
    return found instanceof SVGElement ? found : null;
}

/** The size of the element of the view (none: a link) */
function sizeOf(cellView: dia.CellView): dia.Size {
    const { model } = cellView;
    return model.isElement() ? model.size() : { width: 0, height: 0 };
}

/**
 * Spin the node around a point of the coordinate system it's drawn in
 * (so that the center comes from the model, not from the rendered shape).
 */
function spin(target: SVGElement | null, [x, y]: [number, number], duration: number): Animation[] {
    if (!target) {
        return [];
    }
    const origin = { transformBox: 'view-box', transformOrigin: `${x}px ${y}px` };
    return [target.animate([
        { ...origin, transform: 'rotate(0deg)' },
        { ...origin, transform: 'rotate(360deg)' }
    ], { ...LOOP, duration })];
}

/**
 * Turn the impeller of an agitator around its shaft (seen from the side: it flips over), at the height
 * of the element (0 - 1). The impeller is drawn translated there: the translation is a part of the animation.
 */
function stir(view: dia.CellView, height: number, duration: number): Animation[] {
    const target = node(view, 'impeller');
    if (!target) {
        return [];
    }
    const size = sizeOf(view);
    const at = `translate(${size.width / 2}px, ${size.height * height}px)`;
    const origin = { transformBox: 'view-box', transformOrigin: '0px 0px' };
    return [target.animate([
        { ...origin, transform: `${at} scaleX(1)` },
        { ...origin, transform: `${at} scaleX(-1)` },
        { ...origin, transform: `${at} scaleX(1)` }
    ], { ...LOOP, duration, easing: 'ease-in-out' })];
}

// How fast the boxes ride on a belt (px/s)
const BELT_SPEED = 60;

/**
 * The boxes ride on the belt from its start (over the first roller) to its end, fading in and out there;
 * each is half of the ride behind the other (so the belt is never empty). They move from where they are drawn
 * (see `BOX_POSITIONS`): the ride is relative to it.
 */
function carry(view: dia.CellView): Animation[] {
    const { width, height } = sizeOf(view);
    const [start, end] = [height / 2, width - height / 2 - BOX_WIDTH];
    if (end <= start) {
        return [];
    }
    const duration = (end - start) / BELT_SPEED * 1000;
    return BOX_POSITIONS.flatMap((position, index) => {
        const target = node(view, `box${index + 1}`);
        if (!target) {
            return [];
        }
        const x = position * width;
        return [target.animate([
            { transform: `translateX(${start - x}px)`, opacity: 0 },
            { opacity: 1, offset: 0.1 },
            { opacity: 1, offset: 0.9 },
            { transform: `translateX(${end - x}px)`, opacity: 0 }
        ], { ...LOOP, duration, delay: -duration * index / BOX_POSITIONS.length })];
    });
}

/** The dashes of the stroke move along its path (from its start to its end) by one period of the pattern per cycle */
function dashAlong(target: SVGElement | null, pattern: number[], duration: number): Animation[] {
    if (!target) {
        return [];
    }
    const period = pattern[0] + pattern[1];
    return [target.animate([
        { strokeDashoffset: period },
        { strokeDashoffset: 0 }
    ], { ...LOOP, duration })];
}

/** The node swings around a point (of the coordinate system it is drawn in) by the angle and back */
function swing(target: SVGElement | null, [x, y]: [number, number], angle: number, duration: number): Animation[] {
    if (!target) {
        return [];
    }
    const origin = { transformBox: 'view-box', transformOrigin: `${x}px ${y}px` };
    return [target.animate([
        { ...origin, transform: 'rotate(0deg)' },
        { ...origin, transform: `rotate(${angle}deg)` }
    ], { ...LOOP, duration, direction: 'alternate', easing: 'ease-in-out' })];
}

/**
 * A key on a shaft turns with it (seen from the side: it sweeps across the shaft, from its top to its bottom, showing
 * up and fading) - the shaft from its top (`y`) as tall as `height` (see `Motor`, `Generator`)
 */
function turnShaft(view: dia.CellView, height: number): Animation[] {
    const target = node(view, 'shaftMark');
    if (!target) {
        return [];
    }
    const travel = Math.max(0, height - 2);
    return [target.animate([
        { transform: 'translateY(0)', opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { opacity: 1, offset: 0.8 },
        { transform: `translateY(${travel}px)`, opacity: 0 }
    ], { ...LOOP, duration: 450 })];
}

/** The flames flicker (see `Boiler`, `RotaryKiln`) */
function flicker(view: dia.CellView): Animation[] {
    return ['flameOuter', 'flameInner'].flatMap((selector, index) => {
        const target = node(view, selector);
        if (!target) {
            return [];
        }
        return [target.animate([{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }], {
            ...LOOP,
            duration: 500 + index * 170
        })];
    });
}

/** A point of the element (relative to its size) in its own coordinates */
const at = (cellView: dia.CellView, { x, y }: { x: number; y: number }): [number, number] => {
    const { width, height } = sizeOf(cellView);
    return [x * width, y * height];
};

const isOn = (model: dia.Cell) => Boolean(dataOf(model, 'power'));

/** Whether the liquid passes the element: a switched off pump or a closed valve stops it. */
function isPassing(element: dia.Element | null): boolean {
    if (!element) {
        return true;
    }
    if (hasData(element, 'power') && element.get('type') !== 'Beacon') {
        return isOn(element);
    }
    if (hasData(element, 'open')) {
        return Boolean(dataOf(element, 'open'));
    }
    return true;
}

/** The liquid flows through the pipe (from its source to its target) unless one of its ends stops it. */
function isFlowing(link: dia.Link): boolean {
    return isPassing(link.getSourceElement()) && isPassing(link.getTargetElement());
}

// The length of the dash pattern of the flow (see `Pipe`): the offset that moves it by one period
const FLOW_PERIOD = 24;

/** The dashes move along the path (from its start to its end), as fast in a pipe as in a valve. */
function flowAlong(target: SVGElement): Animation {
    return target.animate([
        { strokeOpacity: 0.8, strokeDashoffset: FLOW_PERIOD },
        { strokeOpacity: 0.8, strokeDashoffset: 0 }
    ], { ...LOOP, duration: 800 });
}

const flow: Animator = (linkView) => {
    const target = node(linkView, 'flow');
    const { model } = linkView;
    if (!target || !model.isLink() || !isFlowing(model)) {
        return [];
    }
    return [flowAlong(target)];
};

/** The center of the element in its own coordinates */
const center = (cellView: dia.CellView): [number, number] => {
    const { width, height } = sizeOf(cellView);
    return [width / 2, height / 2];
};

const animators: Record<string, { kind: AnimationKind; animate: Animator }> = {
    // The rotor and the spokes are drawn around the center already (their groups are moved there).
    Pump: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? spin(node(view, 'rotor'), [0, 0], 1000) : []
    },
    ConveyorBelt: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? carry(view) : []
    },
    // The cleats move along the belt (from its start to its end)
    Conveyor: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? dashAlong(node(view, 'cleats'), CLEAT_PATTERN, 400) : []
    },
    // The buckets go up (their path is drawn from the boot to the head)
    BucketElevator: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? dashAlong(node(view, 'buckets'), BUCKET_PATTERN, 500) : []
    },
    // The liners move round with the drum
    Mill: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? dashAlong(node(view, 'liners'), LINER_PATTERN, 700) : []
    },
    // The flywheel turns, the moving jaw swings to the fixed one and back
    Crusher: {
        kind: 'equipment',
        animate: view => isOn(view.model)
            ? [...spin(node(view, 'spokes'), [0, 0], 600), ...swing(node(view, 'movingJaw'), at(view, JAW_PIVOT), -6, 300)]
            : []
    },
    // The flame burns, the hot zone glows
    RotaryKiln: {
        kind: 'equipment',
        animate: (view) => {
            if (!isOn(view.model)) {
                return [];
            }
            const hotZone = node(view, 'hotZone');
            return [
                ...flicker(view),
                ...(hotZone
                    ? [hotZone.animate([{ fillOpacity: 0.2 }, { fillOpacity: 0.45 }], { ...LOOP, duration: 1400, direction: 'alternate', easing: 'ease-in-out' })]
                    : [])
            ];
        }
    },
    // The bags are cleaned by pulses of air, one after the other
    BagFilter: {
        kind: 'equipment',
        animate: view => BAGS.flatMap((_, index) => {
            const target = node(view, `bag${index + 1}`);
            if (!target) {
                return [];
            }
            return [target.animate([
                { transform: 'translateY(0)', offset: 0 },
                { transform: 'translateY(-3px)', offset: 0.04 },
                { transform: 'translateY(0)', offset: 0.1 },
                { transform: 'translateY(0)', offset: 1 }
            ], { ...LOOP, duration: 4000, delay: index * 1000 })];
        })
    },
    // The impellers at the bottom of the shafts (see `MixingTank`, `Reactor`)
    MixingTank: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? stir(view, 0.8, 900) : []
    },
    Reactor: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? stir(view, 0.75, 1100) : []
    },
    Blower: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? spin(node(view, 'spokes'), [0, 0], 700) : []
    },
    Fan: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? spin(node(view, 'blades'), center(view), 600) : []
    },
    // The blades of each fan are drawn around its hub (their groups are moved there).
    AirCooler: {
        kind: 'equipment',
        animate: view => isOn(view.model)
            ? [...spin(node(view, 'fan1Blades'), [0, 0], 500), ...spin(node(view, 'fan2Blades'), [0, 0], 550)]
            : []
    },
    // The liquid flows through the window of an open valve as through the pipes.
    ControlValve: {
        kind: 'flow',
        animate: view => {
            const target = node(view, 'flow');
            if (!target || !dataOf(view.model, 'open')) {
                return [];
            }
            return [flowAlong(target)];
        }
    },
    // The flames of a firing boiler (see `Boiler`)
    Boiler: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? flicker(view) : []
    },
    Stack: {
        kind: 'equipment',
        animate: view => {
            const target = node(view, 'smoke');
            if (!target) {
                return [];
            }
            return [target.animate([
                { transform: 'translateY(0)', opacity: 0.9 },
                { transform: 'translateY(-12px)', opacity: 0.3 }
            ], { ...LOOP, duration: 1800, easing: 'ease-out' })];
        }
    },
    CoolingTower: {
        kind: 'equipment',
        animate: view => {
            const target = node(view, 'plume');
            if (!target) {
                return [];
            }
            const { width } = sizeOf(view);
            // The plume grows out of the top of the tower.
            const origin = { transformBox: 'view-box', transformOrigin: `${width / 2}px 10px` };
            return [target.animate([
                { ...origin, transform: 'scale(1)' },
                { ...origin, transform: 'scale(1.06, 1.12)' }
            ], { ...LOOP, duration: 2200, direction: 'alternate', easing: 'ease-in-out' })];
        }
    },
    // A key on the shaft (see `turnShaft()`)
    Motor: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? turnShaft(view, 10) : []
    },
    Generator: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? turnShaft(view, sizeOf(view).height * 0.12) : []
    },
    // The steam streams through the casing (its dashes shown and moving)
    Turbine: {
        kind: 'equipment',
        animate: (view) => {
            const target = node(view, 'steam');
            if (!target || !isOn(view.model)) {
                return [];
            }
            return [target.animate([
                { strokeDashoffset: 16, strokeOpacity: 0.7 },
                { strokeDashoffset: 0, strokeOpacity: 0.7 }
            ], { ...LOOP, duration: 350 })];
        }
    },
    // The rotor turns around the symbol (its dashed ring shown)
    Compressor: {
        kind: 'equipment',
        animate: (view) => {
            const target = node(view, 'rotor');
            if (!target || !isOn(view.model)) {
                return [];
            }
            const [x, y] = center(view);
            const origin = { transformBox: 'view-box', transformOrigin: `${x}px ${y}px` };
            return [target.animate([
                { ...origin, transform: 'rotate(0deg)', strokeOpacity: 0.8 },
                { ...origin, transform: 'rotate(360deg)', strokeOpacity: 0.8 }
            ], { ...LOOP, duration: 900 })];
        }
    },
    // The rotor of a wind turbine (drawn around its hub, the group moved there)
    WindTurbine: {
        kind: 'equipment',
        animate: view => isOn(view.model) ? spin(node(view, 'rotor'), [0, 0], 3000) : []
    },
    // The exhaust of a running diesel generator smokes.
    DieselGenerator: {
        kind: 'equipment',
        animate: view => {
            const target = node(view, 'smoke');
            if (!target || !isOn(view.model)) {
                return [];
            }
            return [target.animate([
                { transform: 'translateY(0)', opacity: 0.9 },
                { transform: 'translateY(-12px)', opacity: 0.2 }
            ], { ...LOOP, duration: 1400, easing: 'ease-out' })];
        }
    },
    Beacon: {
        kind: 'alarm',
        animate: view => {
            const target = node(view, 'glow');
            if (!target || !isOn(view.model)) {
                return [];
            }
            return [target.animate([{ opacity: 0.3 }, { opacity: 1 }], {
                ...LOOP,
                duration: 500,
                direction: 'alternate'
            })];
        }
    }
};

// The time the liquid of a level gauge takes to reach its new level (ms)

/** The state of the cell its animations follow: on / off, open / closed */
const stateOf = (cell: dia.Cell) => `${dataOf(cell, 'power') ?? ''}:${dataOf(cell, 'open') ?? ''}`;

export class Animations {

    paper: dia.Paper;
    /** What moves (see `AnimationLevel`): set before `start()` */
    level: AnimationLevel = 'full';
    running = new Map<dia.Cell.ID, Animation[]>();
    /** The state each cell is animated in (on / off, open / closed): animated again when it changes */
    states = new Map<dia.Cell.ID, string>();
    /** Whether the plant is animated already (`start()` needs the diagram rendered, see `AnimationsController`) */
    started = false;

    constructor(paper: dia.Paper) {
        this.paper = paper;
    }

    /** Whether the animations of the kind run at the level */
    allows(kind: AnimationKind): boolean {
        return LEVEL_KINDS[this.level].has(kind);
    }

    start(): void {
        // The diagram is rendered in batches: every one of them says so (see `AnimationsController`), the first is the
        // one that matters - animating it again would send every rotor back to where it started.
        if (this.started) {
            return;
        }
        this.started = true;
        // The values glide to new ones (see `glide.ts`) as the level lets them
        setGliding(this.paper, this.allows('level'));
        this.paper.model.getCells().forEach(cell => this.animate(cell));
    }

    stop(): void {
        this.running.forEach(animations => animations.forEach(animation => animation.cancel()));
        this.running.clear();
        this.states.clear();
        this.started = false;
        setGliding(this.paper, false);
    }

    /** (Re)start the animations of the cell for its current state (e.g. after its power changed). */
    animate(cell: dia.Cell): void {
        this.running.get(cell.id)?.forEach(animation => animation.cancel());
        this.running.delete(cell.id);
        this.states.set(cell.id, stateOf(cell));
        // Not every type of element is animated, nor every kind at the level.
        // A link: its own (a conveyor), or the flow of a pipe
        const animator = animators[cell.get('type')] ?? (cell.isLink() ? { kind: 'flow' as const, animate: flow } : undefined);
        if (!animator || !this.allows(animator.kind)) {
            return;
        }
        const cellView = cell.findView(this.paper);
        if (!cellView) {
            return;
        }
        const animations = animator.animate(cellView);
        if (animations.length > 0) {
            this.running.set(cell.id, animations);
        }
    }

    /** Whether the cell is in another state than it is animated in (switched, opened, closed since) */
    stateChanged(cell: dia.Cell): boolean {
        return this.states.get(cell.id) !== stateOf(cell);
    }

    /** The pipes flow or stop with the equipment at their ends. */
    animatePipes(element: dia.Element): void {
        this.paper.model.getConnectedLinks(element).forEach(link => this.animate(link));
    }
}
