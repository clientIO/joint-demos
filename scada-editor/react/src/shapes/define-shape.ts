import { SURFACE_COLOR } from './surface';
import type { ShapeSpec } from './types';

/** What a shape must say; the rest has the defaults below. */
type ShapeDefinition = Pick<ShapeSpec, 'kind' | 'title' | 'group' | 'description' | 'size' | 'Drawing'> & Partial<ShapeSpec>;

/** The start of the IDs of a kind: its initials, `CV` for `ControlValve`. */
const initialsOf = (kind: string): string => kind.replace(/[^A-Z]/g, '');

/**
 * A kind of element with the defaults of most: resizable down to half its size, rotatable, not flippable, no
 * control, pipe ends anchored anywhere on its sides, in the equipment layer, its IDs its initials, a new one
 * tagged, a finish (shaded or flat) with its color the metal's and an outline of its own.
 */
export function defineShape(definition: ShapeDefinition): ShapeSpec {
    const hasFinish = definition.hasFinish ?? true;
    return {
        resizable: true,
        rotatable: true,
        flippable: null,
        control: null,
        anchors: 'sides',
        layer: 'cells',
        tagPrefix: initialsOf(definition.kind),
        autoTag: true,
        colorField: hasFinish ? { key: 'color', defaultValue: SURFACE_COLOR } : null,
        outlineField: hasFinish ? { key: 'outline' } : null,
        accentField: null,
        hasFinish,
        ...definition,
    };
}
