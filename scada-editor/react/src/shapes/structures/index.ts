import { defineShape } from '../define-shape';
import type { LabelPlacement, ShapeSpec } from '../types';
import { CoolingTowerDrawing } from './cooling-tower';
import { StackDrawing } from './stack';

/** The label below the base. */
const belowBase = (width: number, height: number): LabelPlacement => ({ x: width / 2, y: height + 18, anchor: 'middle', verticalAnchor: 'top' });

const STACK = defineShape({
    kind: 'Stack',
    title: 'Stack',
    group: 'Structures',
    description: 'Takes the flue gas of the boilers and the furnaces up into the air.',
    size: { width: 60, height: 240 },
    defaults: { label: { text: 'Stack', position: 'bottom' } },
    Drawing: StackDrawing,
    tagPrefix: 'ST',
    overflow: { top: 78, right: 16, bottom: 36, left: 8 },
    accentField: { key: 'accent', defaultValue: 'var(--shape-stack-band)' },
    label: belowBase,
});

const COOLING_TOWER = defineShape({
    kind: 'CoolingTower',
    title: 'Cooling Tower',
    group: 'Structures',
    description: 'Cools the water by evaporation: the plume is the water vapor.',
    size: { width: 140, height: 160 },
    defaults: { label: { text: 'Cooling Tower', position: 'bottom' } },
    Drawing: CoolingTowerDrawing,
    overflow: { top: 72, right: 12, bottom: 36, left: 8 },
    label: belowBase,
});

/** The shapes of the structures group of the palette. */
export const STRUCTURES_SHAPES: readonly ShapeSpec[] = [STACK, COOLING_TOWER];
