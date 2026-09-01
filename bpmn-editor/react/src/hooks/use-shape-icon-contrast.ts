import { useCallback, useEffect } from 'react';
import { useGraph, useOnGraphEvents } from '@joint/react-plus';
import { applyIconContrast } from '../utils';

import type { dia } from '@joint/plus';

// Keeps the recolouring off the undo stack — an icon following the theme is a
// consequence of an edit, not one itself. `<Diagram history>` reads this from
// the change options and skips the command.
const NO_HISTORY = { skipHistory: true };

/**
 * Keeps a shape's icon readable against its own body as the theme changes.
 *
 * A BPMN shape draws its type icon as an `<image>` with the colour baked
 * into the SVG data URI, so it cannot follow the theme the way the body
 * does — the body fill is `var(--bpmn-palette-surface)`, a real SVG
 * attribute the browser resolves, while the icon is a picture of a colour
 * decided when the shape was made. Left alone, the library's `#333333`
 * lands on a `#24262A` body in the dark theme and the icon disappears.
 *
 * A shape is painted at birth too (see `createShape`), which covers the
 * clone the stencil flies under the pointer — that one is never in this
 * graph. This keeps the diagram's own shapes in step afterwards.
 */
export function useShapeIconContrast() {

    const { graph } = useGraph();

    const apply = (cell: dia.Cell) => {
        if (cell.isElement()) applyIconContrast(cell, NO_HISTORY);
    };

    const applyToAll = useCallback(() => {
        graph.getElements().forEach((element) => applyIconContrast(element, NO_HISTORY));
    }, [graph]);

    useOnGraphEvents({
        add: apply,
        // A body recoloured in the inspector can want the other icon.
        'change:attrs': apply,
        // Loading a diagram resets the graph rather than adding cell by cell
        // (see `utils/import`), so `add` never fires for what was opened.
        reset: applyToAll
    });

    // The theme is a data attribute on the document element, set by the
    // toolbar's toggle. Watching the attribute rather than the toggle's state
    // keeps this working however the theme comes to change.
    useEffect(() => {
        applyToAll();

        const observer = new MutationObserver(applyToAll);
        observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });

        return () => observer.disconnect();
    }, [applyToAll]);
}
