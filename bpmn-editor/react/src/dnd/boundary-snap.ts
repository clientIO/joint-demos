import type { ui } from '@joint/plus';

// While a dragged element is snapping to an activity border (becoming a
// boundary event), the snaplines are turned off entirely so they don't fight
// the border snapping.
let snaplines: ui.Snaplines | null = null;

export function registerSnaplines(instance: ui.Snaplines): () => void {
    snaplines = instance;
    return () => {
        snaplines = null;
    };
}

export function setBoundarySnapActive(active: boolean): void {
    if (!snaplines) return;

    if (active && !snaplines.isDisabled()) {
        snaplines.disable();
        // Disabling only stops updates — hide the currently visible lines too
        snaplines.hide();
    } else if (!active && snaplines.isDisabled()) {
        snaplines.enable();
    }
}
