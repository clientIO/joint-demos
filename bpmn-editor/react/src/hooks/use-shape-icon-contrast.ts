import { useEffect } from 'react';
import { useGraph, useGraphHistory } from '@joint/react-plus';
import { applyIconContrast } from '../utils';

import type { dia } from '@joint/plus';

// Marks the changes this hook makes, so they stay out of the undo stack —
// recolouring an icon is a consequence of the theme, not an edit.
const ICON_CONTRAST = 'iconContrast';

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
    const { commandManager } = useGraphHistory();

    // Recolouring is not an edit, so it must not land on the undo stack.
    // `cmdBeforeAdd` is the command manager's own veto; anything already
    // installed there keeps its say.
    useEffect(() => {
        if (!commandManager) return;

        const existing = commandManager.get('cmdBeforeAdd');

        const veto = (eventName: string, ...eventArgs: unknown[]) => {
            // The command manager calls this with (name, cell, graph, options).
            const options = eventArgs[2] as { [ICON_CONTRAST]?: boolean } | undefined;
            if (options?.[ICON_CONTRAST]) return false;

            return existing ? existing(eventName, ...eventArgs) : true;
        };

        commandManager.set('cmdBeforeAdd', veto);

        return () => {
            commandManager.set('cmdBeforeAdd', existing ?? undefined);
        };
    }, [commandManager]);

    useEffect(() => {
        if (!graph) return;

        const apply = (cell: dia.Cell) => {
            if (cell.isElement()) applyIconContrast(cell, { [ICON_CONTRAST]: true });
        };

        const applyToAll = () => graph.getElements().forEach(apply);

        applyToAll();

        // A body recoloured in the inspector can want the other icon.
        graph.on('add', apply);
        graph.on('change:attrs', apply);
        // Loading a diagram resets the graph rather than adding cell by cell
        // (see `utils/import`), so `add` never fires for what was opened.
        graph.on('reset', applyToAll);

        // The theme is a data attribute on the document element, set by the
        // toolbar's toggle. Watching the attribute rather than the toggle's
        // state keeps this working however the theme comes to change.
        const observer = new MutationObserver(applyToAll);
        observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });

        return () => {
            graph.off('add', apply);
            graph.off('change:attrs', apply);
            graph.off('reset', applyToAll);
            observer.disconnect();
        };
    }, [graph]);
}
