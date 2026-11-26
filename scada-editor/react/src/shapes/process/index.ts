import { defineShape } from '../define-shape';
import type { LabelPlacement, ShapePorts, ShapeSpec } from '../types';
import { AirCoolerDrawing } from './air-cooler';
import { BagFilterDrawing } from './bag-filter';
import { BoilerDrawing } from './boiler';
import { CycloneDrawing } from './cyclone';
import { DistillationColumnDrawing } from './distillation-column';
import { FilterDrawing } from './filter';
import { HeatExchangerDrawing } from './heat-exchanger';
import { ReactorDrawing } from './reactor';
import { ScrubberDrawing } from './scrubber';
import { SeparatorDrawing } from './separator';

const GROUP = 'Process';

/** The pipe stubs in and out on the left and the right side, at the parts of the height (the middle by default). */
function sideStubs(stubLength: number, left?: number, right?: number): ShapePorts {
    return {
        stubLength,
        stubs: [
            { id: 'left', side: 'left', at: left, z: 0 },
            { id: 'right', side: 'right', at: right, z: 0 },
        ],
    };
}

/** The label below the shape, further down than most: clear of what is under it (saddles, legs, a skirt). */
const labelBelow = (gap: number) => (width: number, height: number): LabelPlacement => ({
    x: width / 2,
    y: height + gap,
    anchor: 'middle',
    verticalAnchor: 'top',
});

const HEAT_EXCHANGER = defineShape({
    kind: 'HeatExchanger',
    title: 'Heat Exchanger',
    group: GROUP,
    description: 'Passes the heat from one liquid to another through the walls of its tubes.',
    size: { width: 160, height: 60 },
    defaults: { label: { text: 'Heat Exchanger', position: 'bottom' } },
    Drawing: HeatExchangerDrawing,
    ports: sideStubs(30),
    tagPrefix: 'HX',
    overflow: { top: 12, bottom: 40 },
    label: labelBelow(20),
});

const FILTER = defineShape({
    kind: 'Filter',
    title: 'Filter',
    group: GROUP,
    description: 'Removes the particles from the liquid or the gas.',
    size: { width: 60, height: 80 },
    defaults: { label: { text: 'Filter', position: 'bottom' } },
    Drawing: FilterDrawing,
    ports: sideStubs(30),
    overflow: { top: 8 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-cap)' },
});

const SEPARATOR = defineShape({
    kind: 'Separator',
    title: 'Separator',
    group: GROUP,
    description: 'Separates the phases of a mixture (the gas from the liquid, the oil from the water).',
    size: { width: 180, height: 80 },
    defaults: { label: { text: 'Separator', position: 'bottom' } },
    Drawing: SeparatorDrawing,
    ports: sideStubs(30),
    tagPrefix: 'SEP',
    overflow: { top: 12, bottom: 36 },
    label: labelBelow(18),
    accentField: { key: 'accent', defaultValue: 'var(--shape-support)' },
});

const BOILER = defineShape({
    kind: 'Boiler',
    title: 'Boiler',
    group: GROUP,
    description: 'Burns a fuel to heat the water into steam.',
    size: { width: 120, height: 160 },
    // The burner on (firing) by default.
    defaults: { label: { text: 'Boiler', position: 'bottom' }, plant: { power: 1 } },
    Drawing: BoilerDrawing,
    control: 'power',
    overflow: { top: 16 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-flame)' },
});

const REACTOR = defineShape({
    kind: 'Reactor',
    title: 'Reactor',
    group: GROUP,
    description: 'A vessel with an agitator where the process reaction takes place.',
    size: { width: 100, height: 160 },
    // The agitator on (stirring) by default.
    defaults: { label: { text: 'Reactor', position: 'bottom' }, plant: { power: 1 } },
    Drawing: ReactorDrawing,
    control: 'power',
    overflow: { top: 30, right: 6, bottom: 34, left: 6 },
    label: labelBelow(16),
    accentField: { key: 'accent', defaultValue: 'var(--shape-motor)' },
});

const DISTILLATION_COLUMN = defineShape({
    kind: 'DistillationColumn',
    title: 'Distillation Column',
    group: GROUP,
    description: 'Separates a mixture by boiling: the lighter parts rise, the heavier ones go down.',
    size: { width: 60, height: 260 },
    defaults: { label: { text: 'Column', position: 'bottom' } },
    Drawing: DistillationColumnDrawing,
    tagPrefix: 'COL',
    overflow: { top: 12, bottom: 36, left: 12 },
    label: labelBelow(18),
    accentField: { key: 'accent', defaultValue: 'var(--shape-skirt)' },
});

const CYCLONE = defineShape({
    kind: 'Cyclone',
    title: 'Cyclone',
    group: GROUP,
    description: 'Spins the gas to throw the dust out of it.',
    size: { width: 80, height: 160 },
    defaults: { label: { text: 'Cyclone', position: 'bottom' } },
    Drawing: CycloneDrawing,
    flippable: 'x',
    tagPrefix: 'CY',
    overflow: { top: 18, left: 24 },
});

const AIR_COOLER = defineShape({
    kind: 'AirCooler',
    title: 'Air Cooler',
    group: GROUP,
    description: 'Cools the liquid in its tubes with the air blown by its fans.',
    size: { width: 160, height: 80 },
    defaults: { label: { text: 'Air Cooler', position: 'bottom' }, plant: { power: 0 } },
    Drawing: AirCoolerDrawing,
    // The fluid runs through the tube bundle (the lower half).
    ports: sideStubs(20, 0.75, 0.75),
    resizable: false,
    control: 'power',
    tagPrefix: 'AC',
    label: labelBelow(16),
    accentField: { key: 'accent', defaultValue: 'var(--shape-plenum)' },
});

const SCRUBBER = defineShape({
    kind: 'Scrubber',
    title: 'Scrubber',
    group: GROUP,
    description: 'Washes the gas with a liquid sprayed over the packing, to remove the pollutants.',
    size: { width: 80, height: 220 },
    defaults: { label: { text: 'Scrubber', position: 'bottom' } },
    Drawing: ScrubberDrawing,
    tagPrefix: 'SC',
    overflow: { top: 14, bottom: 36 },
    label: labelBelow(18),
    accentField: { key: 'accent', defaultValue: 'var(--shape-skirt)' },
});

const BAG_FILTER = defineShape({
    kind: 'BagFilter',
    title: 'Bag Filter',
    group: GROUP,
    description: 'Filters the dust out of the gas on fabric bags, cleaned by pulses of air; the dust falls into the hopper.',
    size: { width: 160, height: 200 },
    defaults: { label: { text: 'Bag Filter', position: 'bottom' } },
    Drawing: BagFilterDrawing,
    // The dusty gas in on the left, the clean gas out of the plenum on the right.
    ports: sideStubs(20, 0.4, 0.05),
    tagPrefix: 'BF',
    accentField: { key: 'accent', defaultValue: 'var(--shape-legs)' },
});

/** The shapes of the Process group of the palette, in its order. */
export const PROCESS_SHAPES: readonly ShapeSpec[] = [
    HEAT_EXCHANGER,
    FILTER,
    SEPARATOR,
    BOILER,
    REACTOR,
    DISTILLATION_COLUMN,
    CYCLONE,
    AIR_COOLER,
    SCRUBBER,
    BAG_FILTER,
];
