/**
 * Fits the board to whatever room the window gives it.
 *
 * There is nothing to scroll on this canvas — the board is the whole content,
 * and a puzzle you have to pan around is a worse puzzle — so there is no
 * `<PaperScroller>` here. The paper does the fitting itself:
 * `transformToFitContent` scales the content to a box, centers it, and honors a
 * padding and a maximum scale, which is the whole job.
 *
 * What it cannot know is *when*. The paper fills its container through CSS, so
 * a window resize changes the room available without the paper hearing about
 * it; the `ResizeObserver` here is what turns that into a refit.
 *
 * The fit runs in a layout effect, and the first one runs before the observer
 * has said anything. Both matter for a new board: `<Diagram>` is remounted, so
 * a passive effect would let the browser paint the new squares at the old
 * board's transform first and correct them a frame later, and waiting on the
 * observer — which reports asynchronously — would add another. The fit reads
 * the graph (`useModelGeometry`) and the element's own box, both of which are
 * settled by the time a layout effect runs, so there is nothing to wait for.
 *
 * Explicitly *not* passing `fittingBBox`: it defaults to the paper's current
 * translate plus its computed size, so handing it a box at the origin fights
 * the transform already applied and every refit after the first lands
 * off-center.
 *
 * The fit depends on the window and the board, and on nothing else. Everything
 * drawn over the canvas — the count, the reject pill, the solved toast — is
 * either placed where a centered board leaves room or accepts overlapping it,
 * because a fit that reacted to them would move the board while the player was
 * looking at it.
 */
import { useLayoutEffect, useRef } from 'react';
import { usePaper } from '@joint/react-plus';
import type { dia } from '@joint/plus';

/** Space left between the board and the edge of its container, in pixels. */
const PADDING = 40;

/**
 * How far the board may be blown up.
 *
 * Above 1 on purpose: a 5x5 board is 220 px across, and leaving it at its
 * natural size in the middle of a wide window makes it look like something
 * failed to load. The squares are flat color and a number, so they take the
 * scaling without going soft.
 */
const MAX_SCALE = 1.7;

const FIT: dia.Paper.TransformToFitContentOptions = {
    padding: PADDING,
    maxScale: MAX_SCALE,
    // The squares are a fixed size written onto the models, so there is nothing
    // to measure in the DOM.
    useModelGeometry: true,
    horizontalAlign: 'middle',
    verticalAlign: 'middle',
};

/**
 * @returns a ref for the element the paper fills. Attach it, and the board
 *   fits itself to that element from the first paint on.
 */
export function useFitToContent(): React.RefObject<HTMLDivElement | null> {
    const ref = useRef<HTMLDivElement>(null);
    const { paper } = usePaper();

    useLayoutEffect(() => {
        const element = ref.current;
        if (!paper || !element) return;

        const fit = () => paper.transformToFitContent(FIT);

        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(element);
        return () => observer.disconnect();
    }, [paper]);

    return ref;
}
