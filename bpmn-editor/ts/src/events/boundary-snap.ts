import type { ui } from '@joint/plus';

/**
 * Turns the snaplines off while a dragged element is snapping to an activity
 * border (becoming a boundary event) — and back on when the snapping ends —
 * so they don't fight the border snapping.
 */
export function setBoundarySnapActive(snaplines: ui.Snaplines | undefined, active: boolean): void {
    if (!snaplines) return;

    if (active && !snaplines.isDisabled()) {
        snaplines.disable();
        // Disabling only stops updates — hide the currently visible lines too
        snaplines.hide();
    } else if (!active && snaplines.isDisabled()) {
        snaplines.enable();
    }
}
