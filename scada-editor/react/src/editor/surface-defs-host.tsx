import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePaper } from '@joint/react-plus';
import { sharedGradientsOf, type SurfaceDefs } from '../shapes/surface';

/**
 * The shared gradients of the surfaces in the `<defs>` of the paper it is in, once each (the metal, the materials,
 * the metal in each color in use): the elements of the paper refer to them (see `SurfaceDefsContext`); an image
 * exported of the paper has them too.
 */
export function SurfaceDefsHost({ surfaceDefs }: { readonly surfaceDefs: SurfaceDefs }) {
    const { paper } = usePaper();
    const colors = useSyncExternalStore(surfaceDefs.subscribe, surfaceDefs.getColors);
    return paper ? createPortal(sharedGradientsOf(colors), paper.defs) : null;
}
