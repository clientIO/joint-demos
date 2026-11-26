import { defineShape } from '../define-shape';
import type { ShapeSpec, Side } from '../types';
import { ElbowDrawing } from './elbow';
import { EndCapDrawing } from './end-cap';
import { FittingDrawing } from './fitting';
import { fittingOverflow, fittingPorts } from './fitting-ports';
import { JoinDrawing } from './join';
import { ManifoldDrawing } from './manifold';
import { MANIFOLD_PORTS } from './manifold-ports';
import { OrificePlateDrawing } from './orifice-plate';
import { YStrainerDrawing } from './y-strainer';
import { ZoneDrawing } from './zone';
import { TIP_DEPTH, ZONE_MIN_SIZE } from './zone-outline';

const FITTING_SIZE = { width: 40, height: 40 };

/** A pipe fitting: a small body with stubs on some sides, as big as the pipes (rotated to turn them), no label. */
function fittingSpec(kind: string, title: string, description: string, sides: readonly Side[], Drawing: ShapeSpec['Drawing'], tagPrefix: string): ShapeSpec {
    return defineShape({
        kind,
        title,
        group: 'Piping',
        description,
        size: FITTING_SIZE,
        Drawing,
        ports: fittingPorts(sides),
        resizable: false,
        overflow: fittingOverflow(sides),
        label: null,
        tagPrefix,
    });
}

const JOIN = defineShape({
    kind: 'Join',
    title: 'Join',
    group: 'Piping',
    description: 'A point where pipes meet, without stubs: a pipe connects to the middle of any of its sides.',
    size: FITTING_SIZE,
    Drawing: JoinDrawing,
    resizable: false,
    // The pipes meet in the middle of the fitting.
    anchors: 'middles',
    overflow: { bottom: 0 },
    label: null,
});

const TEE = fittingSpec(
    'Tee',
    'Tee',
    'A pipe fork: the line goes through and a branch leaves it. Rotate it to turn the branch.',
    ['left', 'right', 'bottom'],
    FittingDrawing,
    'TEE',
);

const CROSS = fittingSpec('Cross', 'Cross', 'Four pipes meet: a line with a branch on each side.', ['left', 'right', 'top', 'bottom'], FittingDrawing, 'CRS');

const ELBOW = fittingSpec('Elbow', 'Elbow', 'The line turns by 90 degrees. Rotate it to choose the turn.', ['left', 'bottom'], ElbowDrawing, 'ELB');

const END_CAP: ShapeSpec = {
    ...fittingSpec('EndCap', 'End Cap', 'Closes the end of a line (a blind end for a future connection).', ['left'], EndCapDrawing, 'CAP'),
    size: { width: 20, height: 40 },
};

const MANIFOLD = defineShape({
    kind: 'Manifold',
    title: 'Manifold',
    group: 'Piping',
    description: 'A distribution header: one inlet, three outlets feeding parallel lines.',
    size: { width: 160, height: 40 },
    defaults: { label: { text: 'Manifold', position: 'top' } },
    Drawing: ManifoldDrawing,
    ports: MANIFOLD_PORTS,
    // Its inlet on the other end, its outlets up: its stubs mirrored.
    flippable: 'xy',
    resizable: false,
    tagPrefix: 'HDR',
});

const Y_STRAINER = defineShape({
    kind: 'YStrainer',
    title: 'Y-Strainer',
    group: 'Piping',
    description: 'Catches the debris in the line before it reaches the pumps and the valves.',
    size: { width: 80, height: 60 },
    defaults: { label: { text: 'Strainer', position: 'bottom' } },
    Drawing: YStrainerDrawing,
    ports: {
        stubLength: 20,
        stubs: [
            { id: 'left', side: 'left' },
            { id: 'right', side: 'right' },
        ],
    },
    // Its leg mirrored: the flow the other way, the leg up, or both.
    flippable: 'xy',
    resizable: { preserveAspectRatio: true },
    tagPrefix: 'STR',
    // The accent: the cap.
    accentField: { key: 'accent' },
});

const ORIFICE_PLATE = defineShape({
    kind: 'OrificePlate',
    title: 'Orifice Plate',
    group: 'Piping',
    description: 'A flow element: the flow is measured from the pressure drop across the plate.',
    size: { width: 40, height: 60 },
    defaults: { label: { text: 'Orifice', position: 'bottom' } },
    Drawing: OrificePlateDrawing,
    ports: {
        stubLength: 20,
        stubs: [
            { id: 'left', side: 'left' },
            { id: 'right', side: 'right' },
        ],
    },
    layer: 'instruments',
    resizable: false,
    // The tab of the plate on the top.
    overflow: { top: 14 },
    tagPrefix: 'FE',
});

const ZONE = defineShape({
    kind: 'Zone',
    title: 'Zone',
    group: 'Piping',
    description: 'Where a pipe comes from or goes to outside of the diagram (another plant section, the supply, the drain).',
    size: { width: 100, height: 40 },
    defaults: { label: { text: 'Zone' } },
    Drawing: ZoneDrawing,
    rotatable: false,
    // Not smaller than its tip takes.
    resizable: { minWidth: ZONE_MIN_SIZE.width, minHeight: ZONE_MIN_SIZE.height },
    // The tip out of the box on its side.
    overflow: (data) => ({ bottom: 0, [data.tipSide === 'right' ? 'right' : 'left']: TIP_DEPTH }),
    // An area of the drawing (its name), never a part of the plant: no ID.
    tagPrefix: null,
    // Its name is drawn inside it, by the drawing.
    label: null,
    hasFinish: false,
    // Its color: the fill; its outline: the border; its accent: the text.
    colorField: { key: 'color', isPart: true },
    outlineField: { key: 'outline', isPart: true },
    accentField: { key: 'accent' },
});

/** The shapes of the piping group of the palette (the pipe itself is a link, not a shape). */
export const PIPING_SHAPES: readonly ShapeSpec[] = [JOIN, TEE, CROSS, ELBOW, END_CAP, MANIFOLD, Y_STRAINER, ORIFICE_PLATE, ZONE];
