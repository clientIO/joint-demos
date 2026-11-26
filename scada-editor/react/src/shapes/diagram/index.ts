import { defineShape } from '../define-shape';
import type { ShapeSpec } from '../types';
import { CustomImageDrawing, GroupDrawing, ScreenDrawing } from './drawings';

// The smallest size of an image: a step of the size (two grid steps).
const IMAGE_MIN_SIZE = 20;

/** The area run mode shows: one per diagram at most, edited in the settings. */
export const SCREEN = defineShape({
    kind: 'Screen',
    title: 'Screen',
    group: 'Background',
    description: 'The area of the diagram the operator sees in run mode.',
    size: { width: 1920, height: 1080 },
    Drawing: ScreenDrawing,
    resizable: false,
    rotatable: false,
    layer: 'background',
    tagPrefix: null,
    autoTag: false,
    label: null,
    overflow: { bottom: 0 },
    hasFinish: false,
});

/** A group of elements: its members are embedded in it. */
export const GROUP = defineShape({
    kind: 'Group',
    title: 'Group',
    group: 'Background',
    description: 'Shapes moved, copied, deleted and styled as a whole.',
    size: { width: 0, height: 0 },
    Drawing: GroupDrawing,
    resizable: false,
    rotatable: false,
    layer: 'background',
    tagPrefix: 'GRP',
    label: null,
    overflow: { bottom: 0 },
    hasFinish: false,
});

/** An uploaded image: saved with the diagram, it can stand for a part of the plant (an ID only when asked). */
export const CUSTOM_IMAGE = defineShape({
    kind: 'CustomImage',
    title: 'Image',
    group: 'Background',
    description: 'An image of your own: its opacity is in the inspector.',
    size: { width: 100, height: 100 },
    defaults: { label: { text: 'Image', position: 'bottom' } },
    Drawing: CustomImageDrawing,
    resizable: { minWidth: IMAGE_MIN_SIZE, minHeight: IMAGE_MIN_SIZE },
    tagPrefix: 'IMG',
    autoTag: false,
    hasFinish: false,
});

/** The shapes of the diagram itself: not in the palette's groups. */
export const DIAGRAM_SHAPES: readonly ShapeSpec[] = [SCREEN, GROUP, CUSTOM_IMAGE];
