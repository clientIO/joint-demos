import type { dia } from '@joint/plus';
import type { AppearanceField, AppearanceRole, AppElement, AppLink } from '../shapes/shapes-typing';

// The order the roles read in a form: the cell's own paint first, then the
// type of its label.
const ROLE_ORDER: AppearanceRole[] = ['fill', 'outline', 'text', 'font-family', 'font-size', 'font-weight'];

/**
 * The cell's current value at a field's path, or the field's default.
 *
 * The one reader both the single-shape and the multi-shape form use, so what
 * a swatch shows as selected cannot drift between them.
 */
export function readFieldValue(cell: dia.Cell, field: { path: string, defaultValue?: string | number }): string {
    const value = cell.prop(field.path) ?? field.defaultValue ?? '';

    return String(value);
}

/**
 * The field this cell controls the given role with, or `null` where it has
 * none — a group and a comment have no fill, a pool exposes no label size, and
 * a data store's cap has no role at all.
 *
 * A field inside a group the cell hides does not count: `visibleWhen` is the
 * cell saying the field does not apply to it, which is how a connector without
 * a label has no label colour or font.
 */
export function fieldFor(cell: AppElement | AppLink, role: AppearanceRole): AppearanceField | null {

    for (const group of cell.getAppearanceConfig()) {
        if (group.visibleWhen && !group.visibleWhen(cell)) continue;

        const field = group.fields.find((candidate) => candidate.role === role);

        if (field) return field;
    }

    return null;
}

/** The roles every one of the cells has, so a form can only offer those. */
export function sharedRoles(cells: (AppElement | AppLink)[]): AppearanceRole[] {

    if (cells.length === 0) return [];

    return ROLE_ORDER.filter((role) => cells.every((cell) => fieldFor(cell, role)));
}

/**
 * The value the cells agree this role has, or `null` where they disagree —
 * which is what leaves a swatch row with nothing selected, and a select box
 * with nothing chosen.
 */
export function sharedValue(cells: (AppElement | AppLink)[], role: AppearanceRole): string | null {

    let shared: string | null = null;

    for (const cell of cells) {
        const field = fieldFor(cell, role);
        if (!field) return null;

        const value = readFieldValue(cell, field);
        if (shared === null) {
            shared = value;
        } else if (shared !== value) {
            return null;
        }
    }

    return shared;
}
