import { defineShape } from '../define-shape';
import type { LabelPlacement, ShapeSpec } from '../types';
import { ConicTankDrawing } from './conic-tank';
import { FuelTankDrawing } from './fuel-tank';
import { HopperDrawing } from './hopper';
import { HorizontalTankDrawing } from './horizontal-tank';
import { LiquidTankDrawing } from './liquid-tank';
import { MixingTankDrawing } from './mixing-tank';
import { SiloDrawing } from './silo';
import { SphericalTankDrawing } from './spherical-tank';
import { WaterTowerDrawing } from './water-tower';

/** The label below the shape, centered, the distance down from its bottom: clear of its legs, saddles. */
const below = (distance: number) => (width: number, height: number): LabelPlacement => ({
    x: width / 2,
    y: height + distance,
    anchor: 'middle',
    verticalAnchor: 'top',
});

const LIQUID_TANK = defineShape({
    kind: 'LiquidTank',
    title: 'Tank',
    group: 'Storage',
    description: 'Stores the liquid. The level is shown by a gauge (a level panel on the tank).',
    size: { width: 160, height: 300 },
    defaults: { label: { text: 'Tank', position: 'bottom' } },
    Drawing: LiquidTankDrawing,
    tagPrefix: 'TK',
});

const CONIC_TANK = defineShape({
    kind: 'ConicTank',
    title: 'Conic Tank',
    group: 'Storage',
    description: 'A tank with a conical bottom that drains whole.',
    size: { width: 160, height: 100 },
    defaults: { label: { text: 'Conic Tank', position: 'bottom' } },
    Drawing: ConicTankDrawing,
    tagPrefix: 'TK',
    overflow: { top: 26, bottom: 62 },
    // Above it: the cone takes the room below.
    label: (width) => ({ x: width / 2, y: -10, anchor: 'middle', verticalAnchor: 'bottom' }),
});

const MIXING_TANK = defineShape({
    kind: 'MixingTank',
    title: 'Mixer',
    group: 'Storage',
    description: 'A tank with an agitator driven by a motor, to blend the liquids.',
    size: { width: 120, height: 160 },
    defaults: { label: { text: 'Mixer', position: 'bottom' }, plant: { power: 1 } },
    Drawing: MixingTankDrawing,
    control: 'power',
    tagPrefix: 'MX',
    overflow: { top: 34 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-motor)' },
    label: below(18),
});

const SILO = defineShape({
    kind: 'Silo',
    title: 'Silo',
    group: 'Storage',
    description: 'Stores the bulk solids (grain, cement, pellets), emptied from the bottom.',
    size: { width: 100, height: 220 },
    defaults: { label: { text: 'Silo', position: 'bottom' } },
    Drawing: SiloDrawing,
    tagPrefix: 'SL',
    overflow: { right: 4, bottom: 34, left: 4 },
    label: below(14),
});

const SPHERICAL_TANK = defineShape({
    kind: 'SphericalTank',
    title: 'Sphere',
    group: 'Storage',
    description: 'Stores a gas under pressure (a sphere takes the pressure best).',
    size: { width: 140, height: 140 },
    defaults: { label: { text: 'Sphere', position: 'bottom' } },
    Drawing: SphericalTankDrawing,
    resizable: { preserveAspectRatio: true },
    tagPrefix: 'TK',
    overflow: { bottom: 38 },
    label: below(20),
});

const HOPPER = defineShape({
    kind: 'Hopper',
    title: 'Hopper',
    group: 'Storage',
    description: 'Feeds the bulk material into the equipment below it.',
    size: { width: 120, height: 120 },
    defaults: { label: { text: 'Hopper', position: 'bottom' } },
    Drawing: HopperDrawing,
    overflow: { top: 4, right: 4, left: 4 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-hopper-material)' },
});

const HORIZONTAL_TANK = defineShape({
    kind: 'HorizontalTank',
    title: 'Horizontal Tank',
    group: 'Storage',
    description: 'A horizontal vessel on saddles (fuel, chemicals, a buffer).',
    size: { width: 200, height: 80 },
    defaults: { label: { text: 'Horizontal Tank', position: 'bottom' } },
    Drawing: HorizontalTankDrawing,
    tagPrefix: 'TK',
    overflow: { top: 16, bottom: 36 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-support)' },
    label: below(18),
});

const WATER_TOWER = defineShape({
    kind: 'WaterTower',
    title: 'Water Tower',
    group: 'Storage',
    description: 'Stores the water up high: the height gives the pressure of the supply.',
    size: { width: 120, height: 220 },
    defaults: { label: { text: 'Water Tower', position: 'bottom' } },
    Drawing: WaterTowerDrawing,
    // Not the initials `WT`: those are a wind turbine's.
    tagPrefix: 'WTW',
    overflow: { top: 16, bottom: 34 },
    label: below(14),
});

const FUEL_TANK = defineShape({
    kind: 'FuelTank',
    title: 'Fuel Tank',
    group: 'Storage',
    description: 'The day tank of a generator: the fuel level in its sight glass, the fuel out by the pipes.',
    size: { width: 160, height: 80 },
    defaults: { label: { text: 'Fuel Tank', position: 'bottom' }, plant: { level: 70 } },
    Drawing: FuelTankDrawing,
    ports: {
        stubLength: 20,
        stubs: [
            { id: 'left', side: 'left', at: 0.5, z: 0 },
            { id: 'right', side: 'right', at: 0.5, z: 0 },
        ],
    },
    resizable: { preserveAspectRatio: true },
    tagPrefix: 'DT',
    accentField: { key: 'accent', defaultValue: 'var(--shape-fuel)' },
});

/** The shapes of the storage group of the palette. */
export const STORAGE_SHAPES: readonly ShapeSpec[] = [
    LIQUID_TANK,
    CONIC_TANK,
    MIXING_TANK,
    SILO,
    SPHERICAL_TANK,
    HOPPER,
    HORIZONTAL_TANK,
    WATER_TOWER,
    FUEL_TANK,
];
