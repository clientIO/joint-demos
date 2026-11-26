import { defineShape } from '../define-shape';
import type { ShapeSpec } from '../types';
import { BucketElevatorDrawing } from './bucket-elevator';
import { ConveyorBeltDrawing } from './conveyor-belt';
import { CrusherDrawing } from './crusher';
import { MillDrawing } from './mill';
import { RotaryKilnDrawing } from './rotary-kiln';

const CONVEYOR_BELT = defineShape({
    kind: 'ConveyorBelt',
    title: 'Belt Conveyor',
    group: 'Bulk Handling',
    description: 'Carries bulk material (coal, grain, parts) between the equipment.',
    size: { width: 200, height: 40 },
    defaults: { label: { text: 'Conveyor', position: 'bottom' }, plant: { power: 0 } },
    Drawing: ConveyorBeltDrawing,
    control: 'power',
    overflow: { top: 22, bottom: 40 },
    // Below its legs.
    label: (width, height) => ({ x: width / 2, y: height + 22, anchor: 'middle', verticalAnchor: 'top' }),
});

const BUCKET_ELEVATOR = defineShape({
    kind: 'BucketElevator',
    title: 'Bucket Elevator',
    group: 'Bulk Handling',
    description: 'Lifts bulk material in buckets on a chain, from the boot at the bottom to the discharge at the top.',
    size: { width: 80, height: 300 },
    defaults: { label: { text: 'Bucket Elevator', position: 'bottom' }, plant: { power: 0 } },
    Drawing: BucketElevatorDrawing,
    flippable: 'x',
    control: 'power',
    overflow: { right: 30, left: 30 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-bucket)' },
});

const CRUSHER = defineShape({
    kind: 'Crusher',
    title: 'Crusher',
    group: 'Bulk Handling',
    description: 'Crushes the rock fed from the top between a fixed jaw and a moving one.',
    size: { width: 140, height: 120 },
    defaults: { label: { text: 'Crusher', position: 'bottom' }, plant: { power: 0 } },
    Drawing: CrusherDrawing,
    resizable: false,
    flippable: 'x',
    control: 'power',
    tagPrefix: 'CR',
    overflow: { right: 8 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-hopper-material)' },
});

const MILL = defineShape({
    kind: 'Mill',
    title: 'Mill',
    group: 'Bulk Handling',
    description: 'A turning drum grinding the material into powder with the steel balls in it.',
    size: { width: 240, height: 100 },
    defaults: { label: { text: 'Mill', position: 'bottom' }, plant: { power: 0 } },
    Drawing: MillDrawing,
    // The liners are a stroke as wide as the drum is tall: not resized.
    resizable: false,
    flippable: 'x',
    control: 'power',
    tagPrefix: 'ML',
    overflow: { top: 10 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-support)' },
});

const ROTARY_KILN = defineShape({
    kind: 'RotaryKiln',
    title: 'Rotary Kiln',
    group: 'Bulk Handling',
    description: 'A long turning drum on riding rings, the material burnt by the flame of the burner in the hood.',
    size: { width: 420, height: 100 },
    defaults: { label: { text: 'Rotary Kiln', position: 'bottom' }, plant: { power: 0 } },
    Drawing: RotaryKilnDrawing,
    resizable: { preserveAspectRatio: true },
    flippable: 'x',
    control: 'power',
    tagPrefix: 'KL',
    overflow: { right: 20 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-support)' },
});

/** The shapes of the bulk group of the palette (the conveyor, a link, is not one of them). */
export const BULK_SHAPES: readonly ShapeSpec[] = [CONVEYOR_BELT, BUCKET_ELEVATOR, CRUSHER, MILL, ROTARY_KILN];
